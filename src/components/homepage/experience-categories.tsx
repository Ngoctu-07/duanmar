"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mountain,
  Landmark,
  UtensilsCrossed,
  Waves,
  Sparkles,
  Music,
} from "lucide-react";

const categories = [
  { key: "nature", icon: Mountain, href: "/explore/things-to-do/nature" },
  { key: "culture", icon: Landmark, href: "/explore/things-to-do/culture" },
  { key: "food", icon: UtensilsCrossed, href: "/explore/things-to-do/food" },
  { key: "beaches", icon: Waves, href: "/explore/things-to-do/beaches" },
  { key: "wellness", icon: Sparkles, href: "/explore/things-to-do/wellness" },
  { key: "nightlife", icon: Music, href: "/explore/things-to-do/nightlife" },
];

export function ExperienceCategories() {
  const t = useTranslations("home");

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t("experienceCategories")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <Link key={category.key} href={category.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <category.icon className="h-10 w-10 mb-4 text-primary" />
                  <span className="font-medium">{t(category.key as keyof typeof t)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
