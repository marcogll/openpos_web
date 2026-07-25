import React from "react";
import { getActiveUsers } from "./src/db/client.js";
import { logger } from "./src/logger.js";

type User = {
  id: number;
  username: string;
  pin: string;
  name: string;
  role: "admin" | "cashier";
  active: number;
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const cachedUsers = React.useRef<Array<{ id: number; username: string; pin: string; name: string; role: string; active: number }>>([]);

  React.useEffect(() => {
    getActiveUsers().then(u => { cachedUsers.current = u; }).catch(err => {
      logger.error("Failed to preload users", { error: String(err) });
    });
  }, []);

  const login = React.useCallback((username: string, pin: string): boolean => {
    const validUser = cachedUsers.current.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin && u.active === 1
    );

    if (validUser) {
      setIsAuthenticated(true);
      setUser(validUser as User);
      return true;
    }

    return false;
  }, []);

  const logout = React.useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return { isAuthenticated, user, login, logout };
}