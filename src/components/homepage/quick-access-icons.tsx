"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Map } from "lucide-react";

const quickLinks = [
  { labelKey: "interactiveMap", icon: Map, href: "/explore/map" },
  { labelKey: "howToBook", icon: BookOpen, href: "/support#how-to-book" },
] as const;

export function QuickAccessIcons() {
  const t = useTranslations("quickLinks");
  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center space-x-3 p-4">
                  <link.icon className="h-6 w-6 stroke-[1.5] text-link" />
                  <span className="text-sm font-medium">{t(link.labelKey)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
