import { Moon, Sun, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useThemeStore, type Theme } from "@/stores/theme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const icon =
    theme === "dark" ? <Moon className="h-4 w-4" /> :
    theme === "light" ? <Sun className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme.toggle", "Toggle theme")}>
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light" as Theme)}>
          <Sun className="mr-2 h-4 w-4" /> {t("theme.light", "Light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark" as Theme)}>
          <Moon className="mr-2 h-4 w-4" /> {t("theme.dark", "Dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system" as Theme)}>
          <Monitor className="mr-2 h-4 w-4" /> {t("theme.system", "System")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
