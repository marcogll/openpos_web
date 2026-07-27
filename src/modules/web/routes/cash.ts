import { Hono } from "hono";
import { getSql, logAudit } from "../webDb";

export const cashRoutes = new Hono();

cashRoutes.get("/", async (c) => {
  try {
    const sql = getSql();
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Number(c.req.query("limit")) || 50);
    const offset = (page - 1) * limit;
    const type = c.req.query("type");
    const date = c.req.query("date");

    let items: any[];
    let countRow: any;

    if (type && date) {
      items = await sql`SELECT * FROM cash_movements WHERE type = ${type} AND DATE(created_at::timestamp) = ${date} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM cash_movements WHERE type = ${type} AND DATE(created_at::timestamp) = ${date}`)[0];
    } else if (type) {
      items = await sql`SELECT * FROM cash_movements WHERE type = ${type} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM cash_movements WHERE type = ${type}`)[0];
    } else if (date) {
      items = await sql`SELECT * FROM cash_movements WHERE DATE(created_at::timestamp) = ${date} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM cash_movements WHERE DATE(created_at::timestamp) = ${date}`)[0];
    } else {
      items = await sql`SELECT * FROM cash_movements ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM cash_movements`)[0];
    }

    return c.json({
      items,
      total: countRow?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countRow?.count || 0) / limit),
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch cash movements" }, 500);
  }
});

cashRoutes.get("/summary", async (c) => {
  try {
    const sql = getSql();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const sales = await sql`
      SELECT method, SUM(total)::float as total, COUNT(*)::int as count
      FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed'
      GROUP BY method
    `;

    const movements = await sql`
      SELECT type, SUM(amount)::float as total, COUNT(*)::int as count
      FROM cash_movements WHERE DATE(created_at::timestamp) = ${date}
      GROUP BY type
    `;

    const opening = await sql`
      SELECT * FROM cash_movements WHERE type = 'opening' AND DATE(created_at::timestamp) = ${date} ORDER BY created_at ASC LIMIT 1
    `;
    const closing = await sql`
      SELECT * FROM cash_movements WHERE type = 'closing' AND DATE(created_at::timestamp) = ${date} ORDER BY created_at DESC LIMIT 1
    `;

    return c.json({
      date,
      sales: Object.fromEntries(sales.map((s: any) => [s.method, { total: s.total, count: s.count }])),
      movements: Object.fromEntries(movements.map((m: any) => [m.type, { total: m.total, count: m.count }])),
      opening: opening[0] || null,
      closing: closing[0] || null,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch summary" }, 500);
  }
});

cashRoutes.post("/movement", async (c) => {
  try {
    const sql = getSql();
    const { type, amount, method, reference, description } = await c.req.json();

    if (!type || !["entry", "exit"].includes(type)) {
      return c.json({ error: "type must be 'entry' or 'exit'" }, 400);
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return c.json({ error: "amount must be positive" }, 400);
    }

    const user = (c as any).get("user")?.username || "system";
    const now = new Date().toISOString();

    await sql`
      INSERT INTO cash_movements (type, amount, method, reference, description, created_at, created_by)
      VALUES (${type}, ${amt}, ${method || "efectivo"}, ${reference || null}, ${description || null}, ${now}, ${user})
    `;

    await logAudit({ entityType: "cash", entityId: `${type}_${now}`, action: type, performedBy: user });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to record movement" }, 500);
  }
});

cashRoutes.post("/open", async (c) => {
  try {
    const sql = getSql();
    const { amount, description } = await c.req.json();

    const existing = await sql`
      SELECT * FROM cash_movements WHERE type = 'opening' AND DATE(created_at::timestamp) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1
    `;
    if (existing.length > 0) {
      return c.json({ error: "Caja ya abierta hoy", opening: existing[0] }, 400);
    }

    const user = (c as any).get("user")?.username || "system";
    const now = new Date().toISOString();
    await sql`
      INSERT INTO cash_movements (type, amount, method, reference, description, created_at, created_by)
      VALUES ('opening', ${Number(amount) || 0}, NULL, 'APERTURA', ${description || "Apertura de caja"}, ${now}, ${user})
    `;

    await logAudit({ entityType: "cash", entityId: `opening_${now}`, action: "open", performedBy: user });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to open cash register" }, 500);
  }
});

cashRoutes.post("/close", async (c) => {
  try {
    const sql = getSql();
    const { expectedCash, actualCash, difference, description } = await c.req.json();
    const user = (c as any).get("user")?.username || "system";
    const now = new Date().toISOString();

    await sql`
      INSERT INTO cash_movements (type, amount, method, reference, description, created_at, created_by)
      VALUES ('closing', ${Number(actualCash) || 0}, NULL, 'CIERRE', ${description || "Cierre de caja"}, ${now}, ${user})
    `;

    await logAudit({ entityType: "cash", entityId: `closing_${now}`, action: "close", performedBy: user, changes: { expectedCash, actualCash, difference } });
    return c.json({ success: true, expectedCash, actualCash, difference });
  } catch (err) {
    return c.json({ error: "Failed to close cash register" }, 500);
  }
});

cashRoutes.get("/cuts", async (c) => {
  try {
    const sql = getSql();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const methods = ["tarjeta", "transf.", "qr/codi"];

    const cuts = await Promise.all(
      methods.map(async (method) => {
        const rows = await sql`
          SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::float as total
          FROM sales WHERE DATE(created_at::timestamp) = ${date} AND method = ${method} AND status = 'completed'
        `;
        const r = rows[0] as any;
        return { method, count: Number(r.count), total: Number(r.total) };
      })
    );

    return c.json({ date, cuts });
  } catch (err) {
    return c.json({ error: "Failed to fetch cuts" }, 500);
  }
});
