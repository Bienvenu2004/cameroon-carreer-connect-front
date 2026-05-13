import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, CompanyStatus } from "@/types/api";

const APP_VARIANT: Record<ApplicationStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  APPLIED: "secondary",
  REVIEWED: "default",
  INTERVIEW: "warning",
  HIRED: "success",
  REJECTED: "destructive",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  return <Badge variant={APP_VARIANT[status]}>{t(`applications.statuses.${status}`)}</Badge>;
}

const COMPANY_VARIANT: Record<CompanyStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  const { t } = useTranslation();
  return <Badge variant={COMPANY_VARIANT[status]}>{t(`company.statuses.${status}`)}</Badge>;
}
