import { Hono } from "hono";
import { requireRole } from "../auth";
import { getRawDb, getOrCreateClient, listClients } from "../webDb";

export const clientRoutes = new Hono();

clientRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const results = listClients(q || undefined);
    return c.json({ items: results, total: results.length });
  } catch (err) {
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

clientRoutes.get("/:rfc", async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const client = db.prepare("SELECT * FROM clients WHERE rfc = ?").get(rfc);
    if (!client) return c.json({ error: "Client not found" }, 404);
    return c.json(client);
  } catch (err) {
    return c.json({ error: "Failed to fetch client" }, 500);
  }
});

clientRoutes.post("/", requireRole("admin"), async (c) => {
  try {
    const body = await c.req.json();
    const { rfc, razonSocial, email, telefono, direccion, regimenFiscal } = body;
    if (!rfc || !razonSocial) {
      return c.json({ error: "rfc and razonSocial are required" }, 400);
    }
    const client = getOrCreateClient({ rfc, razonSocial, email, telefono, direccion, regimenFiscal });
    return c.json(client, 201);
  } catch (err) {
    return c.json({ error: "Failed to create client" }, 500);
  }
});

clientRoutes.put("/:rfc", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const body = await c.req.json();

    const existing = db.prepare("SELECT rfc FROM clients WHERE rfc = ?").get(rfc);
    if (!existing) return c.json({ error: "Client not found" }, 404);

    const updates: string[] = ["updated_at = datetime('now')"];
    const values: any[] = [];
    if (body.razonSocial !== undefined) { updates.push("razon_social = ?"); values.push(body.razonSocial); }
    if (body.email !== undefined) { updates.push("email = ?"); values.push(body.email); }
    if (body.telefono !== undefined) { updates.push("telefono = ?"); values.push(body.telefono); }
    if (body.direccion !== undefined) { updates.push("direccion = ?"); values.push(body.direccion); }
    if (body.regimenFiscal !== undefined) { updates.push("regimen_fiscal = ?"); values.push(body.regimenFiscal); }

    values.push(rfc);
    db.prepare(`UPDATE clients SET ${updates.join(", ")} WHERE rfc = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM clients WHERE rfc = ?").get(rfc);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update client" }, 500);
  }
});

clientRoutes.delete("/:rfc", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const existing = db.prepare("SELECT rfc FROM clients WHERE rfc = ?").get(rfc);
    if (!existing) return c.json({ error: "Client not found" }, 404);
    db.prepare("DELETE FROM clients WHERE rfc = ?").run(rfc);
    return c.json({ message: "Client deleted" });
  } catch (err) {
    return c.json({ error: "Failed to delete client" }, 500);
  }
});
