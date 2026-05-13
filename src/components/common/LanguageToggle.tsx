import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const set = (lng: "fr" | "en") => {
    void i18n.changeLanguage(lng);
    if (typeof window !== "undefined") localStorage.setItem("lang", lng);
  };
  const current = i18n.language?.split("-")[0]?.toUpperCase() ?? "FR";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-3">
          <Globe className="h-4 w-4" />
          <span className="font-medium">{current === "FR" ? "FR" : "EN"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => set("fr")}>🇫🇷 Français</DropdownMenuItem>
        <DropdownMenuItem onClick={() => set("en")}>🇬🇧 English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
