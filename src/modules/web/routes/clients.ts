import { Hono } from "hono";
import { requireRole } from "../auth";
import { getRawDb, getOrCreateClient, listClients } from "../webDb";

export const clientRoutes = new Hono();

const toClientDto = (client: any) => ({
  id: client.id,
  code: client.code,
  rfc: client.rfc,
  razonSocial: client.razon_social ?? client.razonSocial,
  email: client.email,
  telefono: client.telefono,
  direccion: client.direccion,
  regimenFiscal: client.regimen_fiscal ?? client.regimenFiscal,
  puntos: Number(client.puntos ?? 0),
  createdAt: client.created_at ?? client.createdAt,
  updatedAt: client.updated_at ?? client.updatedAt,
});

clientRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const results = await listClients(q || undefined);
    return c.json({ items: results.map(toClientDto), total: results.length });
  } catch (err) {
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

clientRoutes.get("/:rfc", async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const client = await db.get("SELECT * FROM clients WHERE rfc = $1", [rfc]);
    if (!client) return c.json({ error: "Client not found" }, 404);
    return c.json(toClientDto(client));
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
    const client = await getOrCreateClient({ rfc, razonSocial, email, telefono, direccion, regimenFiscal });
    return c.json(toClientDto(client), 201);
  } catch (err) {
    return c.json({ error: "Failed to create client" }, 500);
  }
});

clientRoutes.put("/:rfc", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const body = await c.req.json();

    const existing = await db.get("SELECT rfc FROM clients WHERE rfc = $1", [rfc]);
    if (!existing) return c.json({ error: "Client not found" }, 404);

    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let idx = 1;
    if (body.razonSocial !== undefined) { updates.push(`razon_social = $${idx++}`); values.push(body.razonSocial); }
    if (body.email !== undefined) { updates.push(`email = $${idx++}`); values.push(body.email); }
    if (body.telefono !== undefined) { updates.push(`telefono = $${idx++}`); values.push(body.telefono); }
    if (body.direccion !== undefined) { updates.push(`direccion = $${idx++}`); values.push(body.direccion); }
    if (body.regimenFiscal !== undefined) { updates.push(`regimen_fiscal = $${idx++}`); values.push(body.regimenFiscal); }
    if (body.puntos !== undefined) { updates.push(`puntos = $${idx++}`); values.push(body.puntos); }

    values.push(rfc);
    await db.run(`UPDATE clients SET ${updates.join(", ")} WHERE rfc = $${idx}`, values);

    const updated = await db.get("SELECT * FROM clients WHERE rfc = $1", [rfc]);
    return c.json(toClientDto(updated));
  } catch (err) {
    return c.json({ error: "Failed to update client" }, 500);
  }
});

clientRoutes.delete("/:rfc", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const rfc = c.req.param("rfc");
    const existing = await db.get("SELECT rfc FROM clients WHERE rfc = $1", [rfc]);
    if (!existing) return c.json({ error: "Client not found" }, 404);
    await db.run("DELETE FROM clients WHERE rfc = $1", [rfc]);
    return c.json({ message: "Client deleted" });
  } catch (err) {
    return c.json({ error: "Failed to delete client" }, 500);
  }
});
