"use client";

import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, MapPin, Tag, Map } from "lucide-react";

const quickLinks = [
  { label: "Visa Info", icon: FileText, href: "/plan-your-trip/visa" },
  { label: "Best Time to Visit", icon: Calendar, href: "/plan-your-trip/weather" },
  { label: "Top Destinations", icon: MapPin, href: "/explore/destinations" },
  { label: "Deals", icon: Tag, href: "/deals" },
  { label: "Interactive Map", icon: Map, href: "/explore/map" },
];

export function QuickAccessIcons() {
  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center space-x-3 p-4">
                  <link.icon className="h-6 w-6 stroke-[1.5] text-link" />
                  <span className="text-sm font-medium">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
