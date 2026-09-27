import type { MetadataRoute } from "next";
import enMessages from "@/messages/en.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://vietnam-tourism.com";
  const locales = ["en", "vi"];

  const routes = [
    "",
    "/explore",
    "/explore/destinations",
    "/explore/things-to-do",
    "/explore/itineraries",
    "/explore/festivals",
    "/explore/events",
    "/plan-your-trip",
    "/about",
    "/culture",
    "/deals",
    "/news",
    "/trade",
    "/support",
    "/privacy",
    "/blog",
    "/business-mice",
    "/accessibility",
    "/sitemap",
    ...Object.keys(enMessages.planTrip.guides).map(
      (slug) => `/plan-your-trip/${slug}`,
    ),
  ];

  return routes.flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    }))
  );
}
