import { notFound } from "next/navigation";
import {
  EditorialAnnouncementSection,
  type EditorialAnnouncementData,
} from "@/components/homepage/editorial-announcement-section";

const fixture: EditorialAnnouncementData = {
  announcement: "Editorial",
  heading: "A slower way through Vietnam",
  body: "Some journeys are measured in kilometres; the ones worth keeping are measured in pauses. We follow the back roads between the coast and the highlands, where the day is shaped by market mornings, shared tables and the long light of late afternoon.\n\nSmall groups, local guides, no fixed script.",
  ctaText: "Explore journeys",
  ctaLink: "/tours",
  bgImage: {
    asset: {
      url: "https://cdn.sanity.io/images/81a88ipz/production/89b1436e6bd993bc2090d6a7712c397a23f91ce3-1350x844.jpg",
    },
    alt: "Travelers on a quiet coastal road",
  },
  foregroundImage: {
    asset: {
      url: "https://cdn.sanity.io/images/81a88ipz/production/835c28cc83cef645da688490ee6c29ee832bb5cc-1200x676.png",
    },
    alt: "A street scene in Hanoi",
  },
};

/**
 * Dev-only visual preview for the CMS-driven editorial announcement section.
 * Production builds return 404; the real homepage stays empty until the
 * `homepage.editorialAnnouncement` object is published in Studio.
 */
export default function PreviewAnnouncementPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[#121212]">
      <EditorialAnnouncementSection data={fixture} />
    </main>
  );
}
