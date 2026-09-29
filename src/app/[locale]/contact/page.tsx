import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us | DuanMar",
  description: "Get in touch with DuanMar — Vietnam tourism office",
};

/** Fixed render order (code-level contract, labels/hrefs come from i18n). */
const NODE_KEYS = ["phone", "email", "facebook", "instagram", "tiktok"] as const;
type NodeKey = (typeof NODE_KEYS)[number];

const NODE_ICONS: Partial<Record<NodeKey, typeof Phone>> = {
  phone: Phone,
  email: Mail,
};

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </header>

      <ul className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NODE_KEYS.map((key) => {
          const node = t.raw(`nodes.${key}`) as { label: string; value: string; href: string };
          const Icon = NODE_ICONS[key];
          return (
            <li key={key}>
              <a
                data-testid="contact-node"
                data-node={key}
                href={node.href}
                className="flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted"
              >
                {Icon && <Icon className="size-5 shrink-0 text-primary" aria-hidden />}
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">
                    {node.label}
                  </span>
                  <span className="block truncate text-xl font-semibold">
                    {node.value}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ContactForm />
        <Card>
          <CardHeader>
            <CardTitle>{t("info.hoursTitle")}</CardTitle>
            <CardDescription>{t("info.responseNote")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("info.hours")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
