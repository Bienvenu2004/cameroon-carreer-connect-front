import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="font-display text-7xl font-bold text-primary/20">404</div>
      <h1 className="mt-2 font-display text-2xl font-semibold">{t("errors.notFound")}</h1>
      <Button asChild className="mt-6"><Link to="/">{t("errors.notFoundCta")}</Link></Button>
    </div>
  );
}
