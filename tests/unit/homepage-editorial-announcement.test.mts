import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { HOMEPAGE_QUERY } = await import("../../src/sanity/queries/homepage.ts");
const { parse } = await import("groq-js");
const read = (path: string) =>
  readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const schema = read("sanity/schemaTypes/homepage.ts");
const fieldSchema = read("sanity/schemaTypes/homepage-editorial-announcement.ts");
const page = read("app/[locale]/page.tsx");
const component = read("components/homepage/editorial-announcement-section.tsx");

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

/* --- Studio schema --- */

check("homepage registers the editorialAnnouncement object field", () => {
  assert.ok(
    schema.includes('import { editorialAnnouncementField } from "./homepage-editorial-announcement"'),
    "homepage.ts must import the announcement field module"
  );
  assert.ok(
    schema.includes("editorialAnnouncementField,"),
    "homepage.ts must append editorialAnnouncementField"
  );
});

check("announcement schema declares every dynamic field", () => {
  assert.ok(fieldSchema.includes('name: "editorialAnnouncement"'));
  assert.ok(fieldSchema.includes('type: "object"'));
  for (const field of [
    "announcement",
    "heading",
    "body",
    "ctaText",
    "ctaLink",
    "bgImage",
    "foregroundImage",
  ]) {
    assert.ok(fieldSchema.includes(`name: "${field}"`), `schema missing ${field}`);
  }
});

check("string fields start empty for client authoring", () => {
  const emptyDefaults = fieldSchema.match(/initialValue: ""/g) ?? [];
  assert.ok(
    emptyDefaults.length >= 5,
    `expected empty defaults for tag/heading/body/CTA text/link, got ${emptyDefaults.length}`
  );
  assert.ok(fieldSchema.includes('name: "body"') && fieldSchema.includes('type: "text"'));
  assert.ok(fieldSchema.includes('name: "ctaLink"') && fieldSchema.includes('type: "string"'));
});

check("both images use hotspot", () => {
  assert.ok(fieldSchema.includes('name: "bgImage"'));
  assert.ok(fieldSchema.includes('name: "foregroundImage"'));
  assert.ok(
    (fieldSchema.match(/options: \{ hotspot: true \}/g) ?? []).length >= 2,
    "both portrait images need hotspot"
  );
});

/* --- GROQ --- */

check("HOMEPAGE_QUERY parses and projects the announcement object + image fragments", () => {
  parse(HOMEPAGE_QUERY);
  assert.ok(HOMEPAGE_QUERY.includes("editorialAnnouncement {"));
  for (const field of ["announcement", "heading", "body", "ctaText", "ctaLink"]) {
    assert.ok(HOMEPAGE_QUERY.includes(field), `query missing ${field}`);
  }
  assert.ok(HOMEPAGE_QUERY.includes("bgImage {"), "query missing bgImage");
  assert.ok(HOMEPAGE_QUERY.includes("foregroundImage {"), "query missing foregroundImage");
  assert.ok(
    HOMEPAGE_QUERY.includes("asset->{ _id, url,"),
    "query must use the shared image fragment"
  );
});

/* --- homepage placement --- */

check("component sits between Featured Destinations and About Us", () => {
  assert.ok(page.includes("EditorialAnnouncementSection"));
  const featured = page.indexOf("<FeaturedDestinations");
  const editorial = page.indexOf("<EditorialAnnouncementSection");
  const about = page.indexOf("<AboutUsSection");
  assert.ok(featured >= 0 && editorial >= 0 && about >= 0, "missing section marker");
  assert.ok(featured < editorial, "editorial must follow Featured Destinations");
  assert.ok(editorial < about, "editorial must precede About Us");
});

/* --- defensive rendering + CTA --- */

check("missing data and empty copy omit the section", () => {
  assert.ok(component.includes("if (!data) return null;"));
  assert.ok(
    component.includes("!announcement && !heading && !body && !ctaText && !bgUrl && !fgUrl"),
    "empty-copy guard missing"
  );
});

check("CTA fails closed and external links are safe", () => {
  assert.ok(component.includes("classifyHref(href)"));
  assert.ok(component.includes("if (!target) return null;"));
  assert.ok(component.includes('target: "_blank"'));
  assert.ok(component.includes('rel: "noopener noreferrer"'));
  assert.ok(component.includes('target.href.startsWith("/")'));
});

/* --- layout contract --- */

check("section, grid and column tracks match the spec", () => {
  for (const className of [
    "bg-[#121212]",
    "py-16",
    "lg:py-24",
    "my-8",
    "grid",
    "grid-cols-1",
    "lg:grid-cols-12",
    "gap-8",
    "lg:gap-16",
    "items-center",
    "lg:col-span-5",
    "lg:col-span-7",
  ]) {
    assert.ok(component.includes(className), `missing ${className}`);
  }
});

check("collage, typography and CTA classes match the spec", () => {
  for (const className of [
    // Left collage
    "max-w-xs",
    "lg:max-w-sm",
    "mx-auto",
    "lg:mx-0",
    "min-h-[360px]",
    "w-[72%]",
    "w-[62%]",
    "aspect-[3/4]",
    "-bottom-6",
    "-right-2",
    "shadow-md",
    "shadow-2xl",
    "border-[#D9D9D9]/15",
    "object-cover",
    // Right editorial block
    "border-t",
    "border-[#D9D9D9]/20",
    "pt-6",
    "mb-6",
    "tracking-widest",
    "text-[#D9D9D9]/70",
    "font-heading",
    "text-2xl",
    "lg:text-3xl",
    "font-medium",
    "text-[#D9D9D9]",
    "text-sm",
    "leading-relaxed",
    "text-[#D9D9D9]/80",
    // Compact dark-red CTA
    "bg-[#2F110F]",
    "hover:bg-[#2F110F]/80",
    "px-5",
    "py-2.5",
    "tracking-wider",
    "rounded-sm",
    "transition-colors",
  ]) {
    assert.ok(component.includes(className), `missing ${className}`);
  }
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
