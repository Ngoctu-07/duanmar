import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-bold text-muted-foreground mb-4">404</p>
      <h1 className="text-3xl font-bold mb-3">{t("title")}</h1>
      <p className="text-muted-foreground mb-8 max-w-md">{t("description")}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
