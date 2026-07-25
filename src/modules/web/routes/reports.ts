import { Hono } from "hono";
import { getSql } from "../webDb";

export const reportRoutes = new Hono();

reportRoutes.get("/daily", async (c) => {
  try {
    const sql = getSql();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const summaryRows = await sql`SELECT COALESCE(SUM(total), 0)::double precision as "totalSales", COUNT(*)::int as "totalTickets",
            COALESCE(SUM(item_count), 0)::int as "totalItems", COALESCE(SUM(discount), 0)::double precision as "totalDiscount",
            COALESCE(SUM(tax), 0)::double precision as "totalTax"
     FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed'`;
    const summary = summaryRows[0] as any;

    const byMethodRows = await sql`SELECT method, COUNT(*)::int as count, SUM(total)::double precision as total
     FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed' GROUP BY method`;

    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const row of byMethodRows) {
      byMethod[row.method] = { count: row.count, total: row.total };
    }

    return c.json({
      date,
      totalSales: summary?.totalSales || 0,
      totalTickets: summary?.totalTickets || 0,
      totalItems: summary?.totalItems || 0,
      totalDiscount: summary?.totalDiscount || 0,
      totalTax: summary?.totalTax || 0,
      byMethod,
    });
  } catch (err) {
    return c.json({ error: "Failed to generate daily report" }, 500);
  }
});

reportRoutes.get("/method", async (c) => {
  try {
    const sql = getSql();
    const from = c.req.query("from") || new Date().toISOString().slice(0, 10);
    const to = c.req.query("to") || from;

    const results = await sql`SELECT method, COUNT(*)::int as count, SUM(total)::double precision as total
     FROM sales WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND status = 'completed' GROUP BY method`;

    return c.json({ from, to, methods: results });
  } catch (err) {
    return c.json({ error: "Failed to generate method report" }, 500);
  }
});

reportRoutes.get("/products", async (c) => {
  try {
    const sql = getSql();
    const from = c.req.query("from") || new Date().toISOString().slice(0, 10);
    const to = c.req.query("to") || from;
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 10));

    const allSales = await sql`SELECT items FROM sales WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND status = 'completed'`;

    const productSales: Record<string, any> = {};
    for (const sale of allSales) {
      const items = JSON.parse(sale.items);
      for (const item of items) {
        if (!productSales[item.sku]) {
          const productRows = await sql`SELECT name, category FROM products WHERE sku = ${item.sku}`;
          const product = productRows[0] as any;
          productSales[item.sku] = {
            sku: item.sku,
            name: product?.name || item.name || item.sku,
            category: product?.category || "GEN",
            qtySold: 0,
            totalRevenue: 0,
          };
        }
        productSales[item.sku].qtySold += item.qty;
        productSales[item.sku].totalRevenue += (item.price || 0) * item.qty;
      }
    }

    const ranked = Object.values(productSales)
      .sort((a: any, b: any) => b.qtySold - a.qtySold)
      .slice(0, limit);

    return c.json({ from, to, products: ranked });
  } catch (err) {
    return c.json({ error: "Failed to generate products report" }, 500);
  }
});

reportRoutes.get("/hourly", async (c) => {
  try {
    const sql = getSql();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const results = await sql`SELECT EXTRACT(HOUR FROM created_at::timestamp)::int as hour, COUNT(*)::int as count, SUM(total)::double precision as total
     FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed' GROUP BY EXTRACT(HOUR FROM created_at::timestamp)`;

    const hourly: Record<number, { count: number; total: number }> = {};
    for (let h = 0; h < 24; h++) hourly[h] = { count: 0, total: 0 };
    for (const row of results) {
      hourly[row.hour] = { count: row.count, total: row.total };
    }

    return c.json({ date, hourly });
  } catch (err) {
    return c.json({ error: "Failed to generate hourly report" }, 500);
  }
});
