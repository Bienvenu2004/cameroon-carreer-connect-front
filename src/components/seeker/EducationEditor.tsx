import { useTranslation } from "react-i18next";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ALL_DIPLOMA_LEVELS, type DiplomaLevel, type EducationDto } from "@/types/api";

/**
 * Editor for the education rows on a seeker profile.
 *
 * A separate component rather than another block inside SeekerProfilePage,
 * which is already the largest file in the frontend by a wide margin. The
 * profile page owns the draft list and the submit; this owns the rows.
 *
 * Diploma is the only required field. Someone who holds a Baccalauréat and
 * cannot remember which month they finished should still be able to say so —
 * the qualification is what recruiters filter on, the dates are decoration.
 */
export type EducationDraft = {
  id?: string;
  level: DiplomaLevel;
  fieldOfStudy: string;
  institution: string;
  city: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

export function emptyEducation(): EducationDraft {
  return {
    level: "LICENCE",
    fieldOfStudy: "",
    institution: "",
    city: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  };
}

export function educationFromDto(dto: EducationDto): EducationDraft {
  return {
    id: dto.id,
    level: dto.level,
    fieldOfStudy: dto.fieldOfStudy ?? "",
    institution: dto.institution ?? "",
    city: dto.city ?? "",
    startDate: dto.startDate ?? "",
    endDate: dto.endDate ?? "",
    isCurrent: dto.isCurrent,
    description: dto.description ?? "",
  };
}

export function EducationEditor({
  rows,
  onChange,
}: {
  rows: EducationDraft[];
  onChange: (next: EducationDraft[]) => void;
}) {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<EducationDraft>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("profile.noEducation")}</p>
      )}

      {rows.map((row, i) => (
        <div key={row.id ?? i} className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              {t(`diplomas.${row.level}`)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              aria-label={t("profile.xp.remove")}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("profile.diploma")}</Label>
              <Select
                value={row.level}
                onValueChange={(v) => update(i, { level: v as DiplomaLevel })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_DIPLOMA_LEVELS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`diplomas.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("profile.fieldOfStudy")}</Label>
              <Input
                value={row.fieldOfStudy}
                onChange={(e) => update(i, { fieldOfStudy: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("profile.institution")}</Label>
              <Input
                value={row.institution}
                onChange={(e) => update(i, { institution: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("profile.xp.city")}</Label>
              <Input value={row.city} onChange={(e) => update(i, { city: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("profile.xp.startDate")}</Label>
                <Input
                  type="date"
                  value={row.startDate}
                  onChange={(e) => update(i, { startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("profile.xp.endDate")}</Label>
                <Input
                  type="date"
                  value={row.endDate}
                  disabled={row.isCurrent}
                  onChange={(e) => update(i, { endDate: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground/80 sm:col-span-2">
              <input
                type="checkbox"
                checked={row.isCurrent}
                onChange={(e) =>
                  // Clearing the end date here rather than only on submit keeps
                  // the form honest: a disabled field still showing a date reads
                  // as though it will be saved.
                  update(i, { isCurrent: e.target.checked, endDate: e.target.checked ? "" : row.endDate })
                }
                className="h-4 w-4 rounded border-border accent-primary"
              />
              {t("profile.studyingHere")}
            </label>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("profile.xp.description")}</Label>
              <Textarea
                rows={2}
                value={row.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, emptyEducation()])}
      >
        <Plus className="h-4 w-4" /> {t("profile.addEducation")}
      </Button>
    </div>
  );
}
