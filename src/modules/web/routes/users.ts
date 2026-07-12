import { Hono } from "hono";
import { hashPin } from "../../../shared/src/auth/pin";
import { getRawDb } from "../webDb";

type UserBody = {
  username?: string;
  name?: string;
  pin?: string;
  role?: string;
};

const VALID_ROLES = new Set(["admin", "cashier"]);

export const userRoutes = new Hono();

function normalizeUser(body: UserBody) {
  return {
    username: body.username?.trim() || "",
    name: body.name?.trim() || "",
    pin: body.pin?.trim() || "",
    role: body.role || "cashier",
  };
}

function toUserResponse(row: any) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    pinSet: Boolean(row.pin),
  };
}

function validateUser(body: ReturnType<typeof normalizeUser>, requirePin: boolean) {
  if (!body.username || !body.name || (requirePin && !body.pin)) {
    return requirePin ? "username, name, and pin are required" : "username and name are required";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
    return "username can only contain letters, numbers, and underscores";
  }

  if (body.pin && body.pin.length < 4) {
    return "pin must be at least 4 characters";
  }

  if (!VALID_ROLES.has(body.role)) {
    return "role must be admin or cashier";
  }

  return null;
}

userRoutes.get("/", async (c) => {
  try {
    const db = getRawDb();
    const rows = db
      .prepare(
        "SELECT id, username, name, pin, role, active, created_at, updated_at FROM users WHERE active = 1 ORDER BY username ASC"
      )
      .all();

    return c.json(rows.map(toUserResponse));
  } catch (err) {
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

userRoutes.post("/", async (c) => {
  try {
    const body = normalizeUser(await c.req.json());
    const validationError = validateUser(body, true);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const db = getRawDb();
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(body.username);
    if (existing) {
      return c.json({ error: "User with this username already exists" }, 409);
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (username, name, pin, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    ).run(body.username, body.name, hashPin(body.pin), body.role, now, now);

    const created = db
      .prepare("SELECT id, username, name, pin, role, active, created_at, updated_at FROM users WHERE username = ?")
      .get(body.username);

    return c.json(toUserResponse(created), 201);
  } catch (err) {
    return c.json({ error: "Failed to create user" }, 500);
  }
});

userRoutes.put("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: "Invalid user id" }, 400);
    }

    const body = normalizeUser(await c.req.json());
    const validationError = validateUser(body, false);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const db = getRawDb();
    const existing = db.prepare("SELECT id FROM users WHERE id = ? AND active = 1").get(id);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    const duplicate = db
      .prepare("SELECT id FROM users WHERE username = ? AND id <> ?")
      .get(body.username, id);
    if (duplicate) {
      return c.json({ error: "User with this username already exists" }, 409);
    }

    if (body.pin) {
      db.prepare(
        `UPDATE users
         SET username = ?, name = ?, pin = ?, role = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(body.username, body.name, hashPin(body.pin), body.role, id);
    } else {
      db.prepare(
        `UPDATE users
         SET username = ?, name = ?, role = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(body.username, body.name, body.role, id);
    }

    const updated = db
      .prepare("SELECT id, username, name, pin, role, active, created_at, updated_at FROM users WHERE id = ?")
      .get(id);

    return c.json(toUserResponse(updated));
  } catch (err) {
    return c.json({ error: "Failed to update user" }, 500);
  }
});

userRoutes.delete("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: "Invalid user id" }, 400);
    }

    const db = getRawDb();
    const existing = db.prepare("SELECT id FROM users WHERE id = ? AND active = 1").get(id);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    db.prepare("UPDATE users SET active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return c.json({ message: "User deactivated" });
  } catch (err) {
    return c.json({ error: "Failed to delete user" }, 500);
  }
});
