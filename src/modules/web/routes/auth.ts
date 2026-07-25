import { Hono } from "hono";
import { hashPin, isHashedPin, verifyPin } from "../../../shared/src/auth/pin";
import { createToken, verifyToken } from "../auth";
import { getRawDb } from "../webDb";

export const authRoutes = new Hono();

authRoutes.get("/setup", async (c) => {
  const db = getRawDb();
  const row = await db.get("SELECT COUNT(*)::int as count FROM users") as any;
  return c.json({ needsSetup: row.count === 0 });
});

authRoutes.post("/setup", async (c) => {
  const db = getRawDb();
  const countRow = await db.get("SELECT COUNT(*)::int as count FROM users") as any;
  if (countRow.count > 0) {
    return c.json({ error: "Users already exist. Use login instead." }, 400);
  }

  try {
    const { username, name, pin } = await c.req.json();

    if (!username || !name || !pin) {
      return c.json({ error: "username, name, and pin are required" }, 400);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return c.json({ error: "username can only contain letters, numbers, and underscores" }, 400);
    }
    if (pin.length < 4) {
      return c.json({ error: "pin must be at least 4 characters" }, 400);
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO users (username, name, pin, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin', 1, $4, $5)`,
      [username.trim(), name.trim(), hashPin(pin), now, now]
    );

    const user = await db.get("SELECT * FROM users WHERE username = $1", [username]) as any;
    const token = createToken({ id: user.id, username: user.username, role: user.role });

    return c.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    }, 201);
  } catch (err) {
    return c.json({ error: "Failed to create master user" }, 500);
  }
});

authRoutes.post("/login", async (c) => {
  try {
    const { username, pin } = await c.req.json();

    if (!username || !pin) {
      return c.json({ error: "Username and PIN are required" }, 400);
    }

    const db = getRawDb();
    const user = await db.get(
      "SELECT * FROM users WHERE username = $1 AND active = 1",
      [username]
    ) as any;

    if (!user || !verifyPin(user.pin, pin)) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!isHashedPin(user.pin)) {
      await db.run("UPDATE users SET pin = $1, updated_at = NOW()::text WHERE id = $2",
        [hashPin(pin), user.id]);
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
    const user = await db.get(
      "SELECT * FROM users WHERE id = $1 AND active = 1",
      [payload.id]
    ) as any;

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
