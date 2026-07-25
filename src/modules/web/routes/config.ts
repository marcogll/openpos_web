import { Hono } from "hono";
import { requireRole } from "../auth";
import { getRawDb, getConfig, setConfig } from "../webDb";

export const configRoutes = new Hono();

configRoutes.get("/", async (c) => {
  try {
    const db = getRawDb();
    const rows = await db.all("SELECT * FROM config") as any[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch config" }, 500);
  }
});

configRoutes.get("/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const value = await getConfig(key);
    if (value === null) return c.json({ error: "Config key not found" }, 404);
    return c.json({ key, value });
  } catch (err) {
    return c.json({ error: "Failed to fetch config" }, 500);
  }
});

configRoutes.put("/", requireRole("admin"), async (c) => {
  try {
    const body = await c.req.json();
    let allSaved = true;
    for (const [key, value] of Object.entries(body)) {
      const ok = await setConfig(key, String(value));
      if (!ok) allSaved = false;
    }
    if (!allSaved) return c.json({ error: "Failed to update some config keys" }, 500);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to update config" }, 500);
  }
});

configRoutes.put("/:key", requireRole("admin"), async (c) => {
  try {
    const key = c.req.param("key");
    const body = await c.req.json();
    if (body.value === undefined) return c.json({ error: "value is required" }, 400);
    const success = await setConfig(key, String(body.value));
    if (!success) return c.json({ error: "Failed to update config" }, 500);
    return c.json({ key, value: String(body.value) });
  } catch (err) {
    return c.json({ error: "Failed to update config" }, 500);
  }
});
