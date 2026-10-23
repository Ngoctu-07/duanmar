import { fetchPublished } from "@/sanity/lib/fetch-published";
import { AVATAR_PRESETS_QUERY } from "@/sanity/queries/avatar-presets";

/** Shape returned by `AVATAR_PRESETS_QUERY`. */
export interface AvatarPreset {
  _id: string;
  name: string;
  image?: {
    asset?: { url?: string } | null;
    alt?: string | null;
  } | null;
}

export function avatarImageUrl(preset: AvatarPreset): string | null {
  return preset.image?.asset?.url ?? null;
}

/**
 * Server-only: active presets in editor-defined order. CMS failure degrades to
 * an empty picker (the stored avatar keeps rendering from the user row).
 */
export async function getAvatarPresets(): Promise<AvatarPreset[]> {
  const rows = await fetchPublished(
    AVATAR_PRESETS_QUERY,
    {},
    { tags: ["sanity:avatar:list"] }
  );
  return (rows ?? []) as AvatarPreset[];
}
