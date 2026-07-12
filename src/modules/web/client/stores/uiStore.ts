import { create } from "zustand";

type Theme = "mocha" | "latte";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

type UIStore = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

let toastCounter = 0;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "latte") {
    root.classList.add("latte");
  } else {
    root.classList.remove("latte");
  }
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "latte" || saved === "mocha") return saved;
  return "mocha";
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "true",

  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      localStorage.setItem("sidebarCollapsed", String(next));
      return { sidebarCollapsed: next };
    }),

  theme: initialTheme,

  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "mocha" ? "latte" : "mocha";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
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
