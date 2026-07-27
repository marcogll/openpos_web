import { create } from "zustand";
import { db } from "../db/client.js";
import { hashPin, isHashedPin, verifyPin } from "../auth/pin.js";

type User = {
  id: number;
  username: string;
  pin: string;
  name: string;
  role: "admin" | "cashier";
  active: number;
};

type AuthStore = {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,

  async login(username, pin) {
    const dbUsers = await db.all("SELECT * FROM users WHERE active = 1");
    const validUser = dbUsers.find(
      (u: any) => u.username.toLowerCase() === username.toLowerCase() && verifyPin(u.pin, pin) && u.active === 1
    );

    if (validUser) {
      if (!isHashedPin(validUser.pin)) {
        await db.run("UPDATE users SET pin = $1, updated_at = NOW() WHERE id = $2", [hashPin(pin), validUser.id]);
      }
      set({ isAuthenticated: true, user: validUser as User });
      return true;
    }

    return false;
  },

  logout() {
    set({ isAuthenticated: false, user: null });
  },
}));
