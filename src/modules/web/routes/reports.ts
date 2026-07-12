import { Hono } from "hono";
import { getRawDb } from "../webDb";

export const reportRoutes = new Hono();

reportRoutes.get("/daily", async (c) => {
  try {
    const db = getRawDb();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const summary = db.prepare(
      `SELECT COALESCE(SUM(total), 0) as totalSales, COUNT(*) as totalTickets,
              COALESCE(SUM(item_count), 0) as totalItems, COALESCE(SUM(discount), 0) as totalDiscount,
              COALESCE(SUM(tax), 0) as totalTax
       FROM sales WHERE date(created_at) = ? AND status = 'completed'`
    ).get(date) as any;

    const byMethodRows = db.prepare(
      `SELECT method, COUNT(*) as count, SUM(total) as total
       FROM sales WHERE date(created_at) = ? AND status = 'completed' GROUP BY method`
    ).all(date) as any[];

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
    const db = getRawDb();
    const from = c.req.query("from") || new Date().toISOString().slice(0, 10);
    const to = c.req.query("to") || from;

    const results = db.prepare(
      `SELECT method, COUNT(*) as count, SUM(total) as total
       FROM sales WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed' GROUP BY method`
    ).all(from, to);

    return c.json({ from, to, methods: results });
  } catch (err) {
    return c.json({ error: "Failed to generate method report" }, 500);
  }
});

reportRoutes.get("/products", async (c) => {
  try {
    const db = getRawDb();
    const from = c.req.query("from") || new Date().toISOString().slice(0, 10);
    const to = c.req.query("to") || from;
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 10));

    const allSales = db.prepare(
      `SELECT items FROM sales WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed'`
    ).all(from, to) as any[];

    const productSales: Record<string, any> = {};
    for (const sale of allSales) {
      const items = JSON.parse(sale.items);
      for (const item of items) {
        if (!productSales[item.sku]) {
          const product = db.prepare("SELECT name, category FROM products WHERE sku = ?").get(item.sku) as any;
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
    const db = getRawDb();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);

    const results = db.prepare(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count, SUM(total) as total
       FROM sales WHERE date(created_at) = ? AND status = 'completed' GROUP BY strftime('%H', created_at)`
    ).all(date) as any[];

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
