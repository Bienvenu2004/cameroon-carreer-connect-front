import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "jcc_theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemPreference() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),
  setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));

export function initTheme() {
  const theme = useThemeStore.getState().theme;
  applyTheme(theme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") {
      applyTheme("system");
    }
  });
}
