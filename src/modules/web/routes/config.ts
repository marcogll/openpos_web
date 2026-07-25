import { Hono } from "hono";
import { requireRole } from "../auth";
import { CONFIG_KEYS, getRawDb, getConfig, setConfig } from "../webDb";

export const configRoutes = new Hono();

const ALLOWED_CONFIG_KEYS = new Set<string>([
  ...Object.values(CONFIG_KEYS),
  "scannerEnabled",
  "scannerType",
  "scannerSensitivity",
  "beepOnScan",
  "ledOnScan",
  "autoEnterAfterScan",
  "minBarcodeLength",
  "prefix",
  "suffix",
  "lastTicket",
]);

function normalizeConfigValue(key: string, value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!ALLOWED_CONFIG_KEYS.has(key)) return null;
  if (key === CONFIG_KEYS.FAVICON_URL && !isSafeIconUrl(normalized)) return null;
  if (key === CONFIG_KEYS.FAVICON_SOURCE && !["favicon", "google", "custom"].includes(normalized)) return null;
  if (key === CONFIG_KEYS.TAB_TITLE) return normalized.slice(0, 64);
  if (normalized.length > 2048) return null;
  return normalized;
}

function isSafeIconUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (/^data:image\/(svg\+xml|png|jpeg|x-icon);/i.test(value)) return value.length <= 2048;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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
      const normalizedValue = normalizeConfigValue(key, value);
      if (normalizedValue === null) return c.json({ error: `Invalid config key or value: ${key}` }, 400);
      const ok = await setConfig(key, normalizedValue);
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
    const normalizedValue = normalizeConfigValue(key, body.value);
    if (normalizedValue === null) return c.json({ error: `Invalid config key or value: ${key}` }, 400);
    const success = await setConfig(key, normalizedValue);
    if (!success) return c.json({ error: "Failed to update config" }, 500);
    return c.json({ key, value: normalizedValue });
  } catch (err) {
    return c.json({ error: "Failed to update config" }, 500);
  }
});
