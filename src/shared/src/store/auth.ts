import { create } from "zustand";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPin, isHashedPin, verifyPin } from "../auth/pin.js";
import { sql } from "drizzle-orm";

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
  login: (username: string, pin: string) => boolean;
  logout: () => void;
};

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,

  login(username, pin) {
    const dbUsers = db.select().from(users).where(sql`active = 1`).all();
    const validUser = dbUsers.find(
      (u: typeof users.$inferSelect) => u.username.toLowerCase() === username.toLowerCase() && verifyPin(u.pin, pin) && u.active === 1
    );

    if (validUser) {
      if (!isHashedPin(validUser.pin)) {
        db.run(sql`UPDATE users SET pin = ${hashPin(pin)}, updated_at = datetime('now') WHERE id = ${validUser.id}`);
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
