import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const dir = mkdtempSync(join(tmpdir(), "duanmar-avatar-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");
delete process.env.TURSO_DATABASE_URL;

const { createUser, findUserById, updateUserAvatar, authenticate } = await import(
  "../../src/lib/auth/user-store.ts"
);
const { AVATAR_PRESETS_QUERY } = await import(
  "../../src/sanity/queries/avatar-presets.ts"
);
const { default: schema } = await import(
  "../../src/sanity/schemaTypes/avatar-preset.ts"
);
const { parse } = await import("groq-js");

const userResult = await createUser({
  email: "avatar@duanmar.test",
  name: "Avatar Tester",
  password: "persistent-avatar",
});
assert.equal(userResult.ok, true);
const user = userResult.ok ? userResult.user : null;

await check("new user starts without a preset avatar", () => {
  assert.ok(user);
  assert.equal(user?.avatarPresetId, null);
  assert.equal(user?.avatarUrl, null);
});

await check("selected preset id + CMS URL persist on the user row", async () => {
  assert.ok(user);
  const updated = await updateUserAvatar(user!.id, {
    presetId: "avatar-preset-1",
    url: "https://cdn.sanity.io/images/demo/avatar-1.webp",
  });
  assert.ok(updated);
  assert.equal(updated?.avatarPresetId, "avatar-preset-1");
  assert.equal(updated?.avatarUrl, "https://cdn.sanity.io/images/demo/avatar-1.webp");
});

await check("fresh DB read sees the persisted avatar (new session, same account)", async () => {
  assert.ok(user);
  const row = await findUserById(user!.id);
  assert.equal(row?.avatarPresetId, "avatar-preset-1");
  assert.equal(row?.avatarUrl, "https://cdn.sanity.io/images/demo/avatar-1.webp");
  const login = await authenticate("avatar@duanmar.test", "persistent-avatar");
  assert.equal(login?.avatarPresetId, "avatar-preset-1");
});

await check("switching presets overwrites the previous selection", async () => {
  assert.ok(user);
  await updateUserAvatar(user!.id, { presetId: "avatar-preset-2", url: "https://cdn/2.webp" });
  const row = await findUserById(user!.id);
  assert.equal(row?.avatarPresetId, "avatar-preset-2");
  assert.equal(row?.avatarUrl, "https://cdn/2.webp");
});

await check("unknown user id does not fabricate a row", async () => {
  assert.equal(await updateUserAvatar("missing-user", { presetId: "x", url: "y" }), null);
});

await check("avatarPreset schema exposes the CMS contract", () => {
  const fields = new Map(schema.fields.map((field) => [field.name, field]));
  assert.ok(fields.has("name"), "name missing");
  assert.ok(fields.has("image"), "image missing");
  assert.ok(fields.has("isActive"), "isActive missing");
  assert.ok(fields.has("order"), "order missing");
  assert.equal(fields.get("image")?.type, "image");
});

await check("preset query is active-only, ordered, and projects the asset URL", () => {
  assert.ok(AVATAR_PRESETS_QUERY.includes('_type == "avatarPreset"'));
  assert.ok(AVATAR_PRESETS_QUERY.includes("isActive == true"));
  assert.ok(AVATAR_PRESETS_QUERY.includes("order(order asc, name asc)"));
  assert.ok(AVATAR_PRESETS_QUERY.includes("asset->{ _id, url"));
  parse(AVATAR_PRESETS_QUERY);
});

await check("avatar API trusts only the preset id and resolves the URL server-side", () => {
  const route = readFileSync(
    new URL("../../src/app/api/account/avatar/route.ts", import.meta.url),
    "utf8"
  );
  assert.ok(route.includes("body?.presetId"));
  assert.ok(!route.includes("body?.avatarUrl"), "client URL must never be accepted");
  assert.ok(route.includes("getAvatarPresets"), "active presets must gate the choice");
  assert.ok(route.includes("avatarImageUrl"), "URL must come from the CMS document");
  assert.ok(route.includes("updateUserAvatar"));
  assert.ok(route.includes('error: "unauthorized"'));
});

await check("profile picker has no custom upload input", () => {
  const ui = readFileSync(
    new URL("../../src/components/account/account-avatar.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(!/type=["']file["']/.test(ui), "file uploads are forbidden");
  assert.ok(!ui.includes("<input"), "no raw input elements");
  assert.ok(ui.includes("presets.map"), "must render CMS presets");
  assert.ok(ui.includes("Pencil"), "pencil edit affordance missing");
  assert.ok(ui.includes("/api/account/avatar"), "save endpoint missing");
});

await check("schema is registered in the Studio index", () => {
  const index = readFileSync(
    new URL("../../src/sanity/schemaTypes/index.ts", import.meta.url),
    "utf8"
  );
  assert.ok(index.includes("avatarPreset"));
});

// Windows keeps the SQLite handle open for the process lifetime.
try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // ignore EPERM from the still-open node:sqlite handle
}
console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
