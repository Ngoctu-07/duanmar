import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const SITE_CONFIGURATION_QUERY = defineQuery(`
  *[_type == "siteConfiguration"][0]{
    enableEntryPopup,
    footerSlogan{ vi, en },
    entryPopupImage { ${imageFragment} },
    popupImage_vi { ${imageFragment} },
    popupImage_en { ${imageFragment} },
    contactSettings {
      phone,
      email,
      facebookUrl,
      facebookHandle,
      tiktokUrl,
      tiktokHandle,
      instagramUrl,
      instagramHandle,
      threadsUrl,
      threadsHandle,
      youtubeUrl,
      youtubeHandle
    }
  }
`);
