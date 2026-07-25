import { create } from "zustand";

export type ThemeMode = "dark" | "light";
export type ColorScheme = "standard" | "dracula" | "nord" | "gruvbox" | "rose-pine";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

type UIStore = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  theme: "mocha" | "latte";
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

let toastCounter = 0;

const COLOR_SCHEMES: ColorScheme[] = ["standard", "dracula", "nord", "gruvbox", "rose-pine"];

function applyTheme(mode: ThemeMode, scheme: ColorScheme) {
  const root = document.documentElement;
  root.classList.remove(
    "latte",
    "theme-dark",
    "theme-light",
    ...COLOR_SCHEMES.map((item) => `scheme-${item}`)
  );
  root.classList.add(mode === "light" ? "theme-light" : "theme-dark", `scheme-${scheme}`);
  if (mode === "light") root.classList.add("latte");
}

function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem("theme");
  const savedMode = localStorage.getItem("themeMode");
  if (savedMode === "light" || savedMode === "dark") return savedMode;
  if (saved === "latte") return "light";
  return "dark";
}

function getInitialColorScheme(): ColorScheme {
  const saved = localStorage.getItem("colorScheme");
  return COLOR_SCHEMES.includes(saved as ColorScheme) ? (saved as ColorScheme) : "standard";
}

const initialThemeMode = getInitialThemeMode();
const initialColorScheme = getInitialColorScheme();
applyTheme(initialThemeMode, initialColorScheme);

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "true",

  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      localStorage.setItem("sidebarCollapsed", String(next));
      return { sidebarCollapsed: next };
    }),

  themeMode: initialThemeMode,
  colorScheme: initialColorScheme,
  theme: initialThemeMode === "light" ? "latte" : "mocha",

  toggleTheme: () =>
    set((s) => {
      const next: ThemeMode = s.themeMode === "dark" ? "light" : "dark";
      localStorage.setItem("themeMode", next);
      localStorage.setItem("theme", next === "light" ? "latte" : "mocha");
      applyTheme(next, s.colorScheme);
      return { themeMode: next, theme: next === "light" ? "latte" : "mocha" };
    }),

  setColorScheme: (scheme) =>
    set((s) => {
      localStorage.setItem("colorScheme", scheme);
      applyTheme(s.themeMode, scheme);
      return { colorScheme: scheme };
    }),

  toasts: [],

  addToast(message, type = "info") {
    const id = `toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
