import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote, Building2, Cpu, Factory, GraduationCap, HandHeart, HardHat,
  Heart, Hotel, Landmark, Leaf, Megaphone, MoreHorizontal, Radio,
  Scale, ShoppingBag, Shirt, Truck, Users, Zap,
  type LucideIcon,
} from "lucide-react";

import { CompaniesApi } from "@/api";
import { ALL_INDUSTRIES, type Industry } from "@/types/api";

/**
 * Browse employers by industry.
 *
 * A directory rather than a filter: someone who knows they want to work in
 * banking, or in agriculture, has a different starting question from someone
 * typing a job title, and making them find the industry dropdown buried in the
 * company list filters answers it badly.
 *
 * Counts come from one grouped query on the server. Twenty list requests from
 * the browser to discover twenty numbers is exactly the thing this platform
 * cannot afford on a metered connection.
 *
 * Every industry renders, including the empty ones. A category that silently
 * disappears when it has no companies makes the grid look broken rather than
 * honest — and the count tells the visitor the truth before they click.
 */
const ICONS: Record<Industry, LucideIcon> = {
  AGRICULTURE: Leaf,
  BANKING_FINANCE: Banknote,
  CONSTRUCTION: HardHat,
  CONSULTING: Users,
  EDUCATION: GraduationCap,
  ENERGY_UTILITIES: Zap,
  GOVERNMENT: Landmark,
  HEALTHCARE: Heart,
  HOSPITALITY_TOURISM: Hotel,
  INFORMATION_TECHNOLOGY: Cpu,
  LEGAL: Scale,
  LOGISTICS_TRANSPORT: Truck,
  MANUFACTURING: Factory,
  MEDIA_COMMUNICATION: Megaphone,
  NGO_NONPROFIT: HandHeart,
  REAL_ESTATE: Building2,
  RETAIL_TRADE: ShoppingBag,
  TELECOMMUNICATIONS: Radio,
  TEXTILES_FASHION: Shirt,
  OTHER: MoreHorizontal,
};

export function IndustriesPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["industry-counts"],
    queryFn: () => CompaniesApi.industryCounts(),
  });

  const counts = new Map(data?.map((row) => [row.industry, row.count]) ?? []);

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("industries.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("industries.subtitle")}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_INDUSTRIES.map((industry) => {
            const Icon = ICONS[industry];
            const count = counts.get(industry) ?? 0;

            return (
              <Link
                key={industry}
                to={`/companies?industry=${industry}`}
                className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-semibold text-foreground group-hover:text-primary">
                    {t(`industries.${industry}`)}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {isLoading
                      ? t("common.loading")
                      : t("industries.companyCount", { count })}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
