"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapDestination {
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
}

interface DestinationsMapProps {
  destinations: MapDestination[];
  locale: string;
}

export function DestinationsMap({ destinations, locale }: DestinationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current).setView([16.0, 106.0], 6);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      for (const destination of destinations) {
        if (destination.lat == null || destination.lng == null) continue;
        L.marker([destination.lat, destination.lng])
          .addTo(map)
          .bindPopup(
            `<a href="/${locale}/explore/destinations/${destination.slug}">${destination.name}</a>`
          );
      }
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [destinations, locale]);

  return (
    <div
      ref={containerRef}
      data-testid="destinations-map"
      className="h-[420px] w-full rounded-xl border"
      role="region"
      aria-label="Destinations map"
    />
  );
}
