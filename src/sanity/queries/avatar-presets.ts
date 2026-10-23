import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

/**
 * Active avatar presets for the account picker. `order` gives editors explicit
 * control; the name is a stable tie-breaker. The asset URL is what the server
 * persists on the user row, so the UI never trusts a client-supplied URL.
 */
export const AVATAR_PRESETS_QUERY = defineQuery(`
  *[_type == "avatarPreset" && isActive == true] | order(order asc, name asc) {
    _id,
    name,
    order,
    image { ${imageFragment} }
  }
`);
