import { create } from "zustand";

type User = {
  id: number;
  username: string;
  name: string;
  role: "owner-admin" | "admin" | "cashier";
};

type AuthStore = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: !!localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),

  login: async (username, pin) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ isAuthenticated: true, user: data.user, token: data.token });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ isAuthenticated: false, user: null, token: null });
  },
}));
