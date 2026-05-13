import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { SavedSearchApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ALL_REGIONS, type Region, type SavedSearchFrequency } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api";

export function SavedSearchesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({ queryKey: ["saved-searches"], queryFn: () => SavedSearchApi.list() });

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [frequency, setFrequency] = useState<SavedSearchFrequency>("DAILY");

  const create = useMutation({
    mutationFn: () => SavedSearchApi.create({
      label,
      keyword: keyword || undefined,
      region: region === "" ? null : region,
      active: true,
      frequency,
    }),
    onSuccess: () => {
      toast({ title: t("common.successSaved"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["saved-searches"] });
      setOpen(false); setLabel(""); setKeyword(""); setRegion(""); setFrequency("DAILY");
    },
    onError: (e) => toast({ title: t("common.errorOccurred"), description: apiErrorMessage(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => SavedSearchApi.remove(id),
    onSuccess: () => {
      toast({ title: t("common.successDeleted"), variant: "success" });
      void qc.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("savedSearches.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("savedSearches.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> {t("savedSearches.createTitle")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("savedSearches.createTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ss-label">{t("savedSearches.label")}</Label>
                <Input id="ss-label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("savedSearches.labelPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ss-kw">{t("savedSearches.keyword")}</Label>
                <Input id="ss-kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("jobs.region")}</Label>
                <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                  <SelectTrigger><SelectValue placeholder={t("home.regionPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {ALL_REGIONS.map((r) => <SelectItem key={r} value={r}>{t(`regions.${r}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("savedSearches.frequency")}</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as SavedSearchFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">{t("savedSearches.daily")}</SelectItem>
                    <SelectItem value="WEEKLY">{t("savedSearches.weekly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">{t("common.cancel")}</Button>
                </DialogClose>
                <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {list.data && list.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          {t("savedSearches.empty")}
        </div>
      )}

      <div className="space-y-3">
        {list.data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 elev-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium">{s.label}</h3>
                {s.active && <Badge variant="success">{t("savedSearches.active")}</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {s.keyword && <span>« {s.keyword} »</span>}
                {s.region && <span>{t(`regions.${s.region}`)}</span>}
                <span>{s.frequency === "DAILY" ? t("savedSearches.daily") : t("savedSearches.weekly")}</span>
                <span>{t("savedSearches.lastSent")}: {s.lastSentAt ? relativeTime(s.lastSentAt, locale) : t("savedSearches.never")}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" loading={remove.isPending && remove.variables === s.id} onClick={() => s.id && remove.mutate(s.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
