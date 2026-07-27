import { Hono } from "hono";
import { getRawDb, logAudit } from "../webDb";
import { requireRole } from "../auth";

export const auditRoutes = new Hono();

auditRoutes.get("/", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const entityType = c.req.query("entity_type");
    const action = c.req.query("action");
    const performedBy = c.req.query("performed_by");
    const limit = Math.min(500, Math.max(1, Number(c.req.query("limit")) || 100));
    const offset = Math.max(0, Number(c.req.query("offset")) || 0);
    const format = c.req.query("format");

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (entityType) { conditions.push(`entity_type = $${idx++}`); params.push(entityType); }
    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    if (performedBy) { conditions.push(`performed_by = $${idx++}`); params.push(performedBy); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = await db.get(`SELECT COUNT(*)::int as count FROM audit_log ${where}`, params) as any;

    params.push(limit, offset);
    const rows = await db.all(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    if (format === "csv") {
      const header = "id,entity_type,entity_id,action,changes,performed_by,ip_address,created_at";
      const csvRows = rows.map((r: any) =>
        `"${r.id}","${r.entity_type}","${r.entity_id}","${r.action}","${(r.changes || "").replace(/"/g, '""')}","${r.performed_by}","${r.ip_address || ""}","${r.created_at}"`
      );
      c.header("Content-Type", "text/csv; charset=utf-8");
      c.header("Content-Disposition", `attachment; filename="audit_log_${new Date().toISOString().slice(0, 10)}.csv"`);
      return c.body([header, ...csvRows].join("\n"));
    }

    return c.json({
      items: rows,
      total: countRow?.count || 0,
      limit,
      offset,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch audit log" }, 500);
  }
});

auditRoutes.get("/summary", requireRole("admin"), async (c) => {
  try {
    const db = getRawDb();
    const days = Math.min(365, Math.max(1, Number(c.req.query("days")) || 30));
    const byAction = await db.all(
      `SELECT entity_type, action, COUNT(*)::int as count FROM audit_log WHERE created_at::timestamp > NOW() - INTERVAL '${days} days' GROUP BY entity_type, action ORDER BY entity_type, action`
    );
    const byUser = await db.all(
      `SELECT performed_by, COUNT(*)::int as count FROM audit_log WHERE created_at::timestamp > NOW() - INTERVAL '${days} days' GROUP BY performed_by ORDER BY count DESC LIMIT 20`
    );
    return c.json({ days, byAction, byUser });
  } catch (err) {
    return c.json({ error: "Failed to fetch audit summary" }, 500);
  }
});
