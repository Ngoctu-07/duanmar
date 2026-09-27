import type { Metadata, Viewport } from "next";
import { NextStudio } from "next-sanity/studio";
import {
  metadata as studioMetadata,
  viewport as studioViewport,
} from "next-sanity/studio";
import config from "../../../../sanity.config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  ...studioMetadata,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = studioViewport as Viewport;

export default function StudioPage() {
  return <NextStudio config={config} />;
}
