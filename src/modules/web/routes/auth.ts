import { Hono } from "hono";
import { hashPin, isHashedPin, verifyPin } from "../../../shared/src/auth/pin";
import { createToken, verifyToken } from "../auth";
import { getRawDb } from "../webDb";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  try {
    const { username, pin } = await c.req.json();

    if (!username || !pin) {
      return c.json({ error: "Username and PIN are required" }, 400);
    }

    const db = getRawDb();
    const user = db.prepare(
      "SELECT * FROM users WHERE username = ? AND active = 1"
    ).get(username) as any;

    if (!user || !verifyPin(user.pin, pin)) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!isHashedPin(user.pin)) {
      db.prepare("UPDATE users SET pin = ?, updated_at = datetime('now') WHERE id = ?")
        .run(hashPin(pin), user.id);
    }

    const token = createToken({ id: user.id, username: user.username, role: user.role });

    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    return c.json({ error: "Login failed" }, 500);
  }
});

authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) return c.json({ error: "Invalid token" }, 401);

    const db = getRawDb();
    const user = db.prepare(
      "SELECT * FROM users WHERE id = ? AND active = 1"
    ).get(payload.id) as any;

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
