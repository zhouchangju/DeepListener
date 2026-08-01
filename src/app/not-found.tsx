import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <Compass className="h-12 w-12 text-primary mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">{t("pageNotFound")}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t("pageNotFoundDesc")}
      </p>
      <Button asChild>
        <Link href="/">{t("backToHome")}</Link>
      </Button>
    </div>
  );
}
