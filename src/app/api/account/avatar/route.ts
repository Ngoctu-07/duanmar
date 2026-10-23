import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { updateUserAvatar } from "@/lib/auth/user-store";
import { avatarImageUrl, getAvatarPresets } from "@/lib/avatars";

export const runtime = "nodejs";

/**
 * `PATCH /api/account/avatar` — persist one of the CMS-managed presets.
 *
 * The client sends only the preset document id. The URL is resolved from the
 * active CMS list server-side, so a visitor can never point the avatar at an
 * arbitrary/uploaded asset.
 */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { presetId?: unknown };
  try {
    body = (await request.json()) as { presetId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const presetId =
    typeof body?.presetId === "string" ? body.presetId.trim() : "";
  if (!presetId || presetId.length > 120) {
    return NextResponse.json({ error: "invalid_preset" }, { status: 400 });
  }

  const presets = await getAvatarPresets();
  const preset = presets.find((entry) => entry._id === presetId);
  const url = preset ? avatarImageUrl(preset) : null;
  if (!preset || !url) {
    return NextResponse.json({ error: "preset_not_found" }, { status: 400 });
  }

  const updated = updateUserAvatar(user.id, { presetId: preset._id, url });
  if (!updated) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ user: updated });
}
