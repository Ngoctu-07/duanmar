import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const SITE_CONFIGURATION_QUERY = defineQuery(`
  *[_type == "siteConfiguration"][0]{
    enableEntryPopup,
    entryPopupImage { ${imageFragment} },
    popupImage_vi { ${imageFragment} },
    popupImage_en { ${imageFragment} },
    socialLinks[]{ _key, platform, displayText, targetUrl }
  }
`);
