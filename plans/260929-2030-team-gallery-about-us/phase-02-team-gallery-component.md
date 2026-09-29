# Phase 02 — TeamGallery Component + About Section Integration

**Status**: Complete (100%) · **Depends on**: Phase 1 · **Priority**: High

## New `src/components/homepage/team-gallery.tsx` (server component)
```tsx
export function TeamGallery({ images }: { images: TeamGalleryImage[] }) {
  if (images.length < 3) return null;   // graceful until content exists
  const [left, top, bottom] = images;
  return (
    <div data-testid="team-gallery"
      className="mt-10 grid h-[400px] max-h-[50vh] grid-cols-2 gap-4">
      <div className="relative overflow-hidden rounded-lg">
        <Image fill sizes="50vw" className="object-cover object-center" … />
      </div>
      <div className="grid grid-rows-2 gap-4">
        <div className="relative overflow-hidden rounded-lg"><Image fill sizes="50vw" … /></div>
        <div className="relative overflow-hidden rounded-lg"><Image fill sizes="50vw" … /></div>
      </div>
    </div>
  );
}
```
- `alt={img.alt ?? ""}`; img type: `{ asset?: { url: string }; alt?: string }`.
- i18n not needed (images only).

## `about-us-section.tsx`
- Prop `gallery?: TeamGalleryImage[]`; render `<TeamGallery images={gallery ?? []} />` after the 50/50 grid, inside `.container` (approved: inside band).

## Verify
- `/vi` + `/en`: gallery (when content exists) sits below grid inside `data-testid="about-us-section"`; `j`/`n` tests still green.
