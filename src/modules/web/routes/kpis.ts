import { Hono } from "hono";
import { requireRole } from "../auth";
import { getSql } from "../webDb";

export const kpisRoutes = new Hono();

type SaleItem = {
  sku?: string;
  name?: string;
  qty?: number;
  price?: number;
};

function parseSaleItems(items: unknown): SaleItem[] {
  if (Array.isArray(items)) return items as SaleItem[];
  if (typeof items !== "string") return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

kpisRoutes.get("/", requireRole("admin"), async (c) => {
  try {
    const sql = getSql();
    const date = c.req.query("date") || new Date().toISOString().slice(0, 10);
    const from = c.req.query("from") || new Date().toISOString().slice(0, 10);
    const to = c.req.query("to") || from;

    const summaryRows = await sql`SELECT COALESCE(SUM(total), 0)::double precision as "totalSales", COUNT(*)::int as "totalTickets",
            COALESCE(SUM(item_count), 0)::int as "totalItems", COALESCE(SUM(discount), 0)::double precision as "totalDiscount",
            COALESCE(SUM(tax), 0)::double precision as "totalTax", COALESCE(AVG(received), 0)::double precision as "averageReceived"
     FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed'`;
    const summary = summaryRows[0] as any;

    const salesByDayRows = await sql`SELECT DATE(created_at::timestamp) as date, COALESCE(SUM(total), 0)::double precision as "totalSales",
            COUNT(*)::int as "totalTickets", COALESCE(SUM(item_count), 0)::int as "totalItems"
     FROM sales WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND status = 'completed' GROUP BY DATE(created_at::timestamp) ORDER BY date`;
    const salesByDay = salesByDayRows.map((row: any) => ({
      date: row.date,
      totalSales: row.totalSales,
      totalTickets: row.totalTickets,
      totalItems: row.totalItems,
    }));

    const salesByMethodRows = await sql`SELECT method, COUNT(*)::int as count, SUM(total)::double precision as total
     FROM sales WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND status = 'completed' GROUP BY method ORDER BY total DESC`;
    const salesByMethod = salesByMethodRows.map((row: any) => ({
      method: row.method,
      count: row.count,
      total: row.total,
    }));

    const topProductsRows = await sql`SELECT p.sku, p.name, p.category, COUNT(*)::int as qtySold, SUM(s.total)::double precision as totalRevenue
     FROM sales s JOIN products p ON s.items LIKE '%' || p.sku || '%' AND p.active = 1
     WHERE DATE(s.created_at::timestamp) BETWEEN ${from} AND ${to} AND s.status = 'completed'
     GROUP BY p.sku, p.name, p.category ORDER BY totalRevenue DESC LIMIT 10`;
    const topProducts = topProductsRows.map((row: any) => ({
      sku: row.sku,
      name: row.name,
      category: row.category,
      qtySold: row.qtySold,
      totalRevenue: row.totalRevenue,
    }));

    const hourlyRows = await sql`SELECT EXTRACT(HOUR FROM created_at::timestamp)::int as hour, COUNT(*)::int as count, SUM(total)::double precision as total
     FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = 'completed' GROUP BY EXTRACT(HOUR FROM created_at::timestamp) ORDER BY hour`;
    const hourly = hourlyRows.map((row: any) => ({
      hour: row.hour,
      count: row.count,
      total: row.total,
    }));

    const dailyReportRows = await sql`SELECT DATE(created_at::timestamp) as date, COUNT(*)::int as count, COALESCE(SUM(received - total), 0)::double precision as "changeHeld"
     FROM sales WHERE status = 'completed' GROUP BY DATE(created_at::timestamp) ORDER BY date DESC LIMIT 30`;
    const dailyReport = dailyReportRows.map((row: any) => ({
      date: row.date,
      count: row.count,
      changeHeld: row.changeHeld,
    }));

    const clientsRows = await sql`SELECT COUNT(DISTINCT customer_rfc)::int as clients FROM sales WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND customer_rfc IS NOT NULL`;
    const clients = clientsRows[0]?.clients || 0;

    const periodSalesRows = await sql`
      SELECT ticket, subtotal, tax, total, method, items, created_at
      FROM sales
      WHERE DATE(created_at::timestamp) BETWEEN ${from} AND ${to} AND status = 'completed'
    `;

    const productRows = await sql`
      SELECT sku, name, category, stock, min_stock, cost, price, unit_type
      FROM products
      WHERE active = 1
    `;

    const productsBySku = new Map<string, any>();
    for (const product of productRows as any[]) productsBySku.set(product.sku, product);

    const productSales = new Map<string, {
      sku: string;
      name: string;
      category: string;
      qtySold: number;
      revenue: number;
      cost: number;
      stock: number;
      minStock: number;
      unitType: string;
    }>();

    for (const sale of periodSalesRows as any[]) {
      for (const item of parseSaleItems(sale.items)) {
        if (!item.sku) continue;
        const product = productsBySku.get(item.sku);
        const qty = Number(item.qty || 0);
        const price = Number(item.price ?? product?.price ?? 0);
        const cost = Number(product?.cost || 0);
        const prev = productSales.get(item.sku) || {
          sku: item.sku,
          name: product?.name || item.name || item.sku,
          category: product?.category || "GEN",
          qtySold: 0,
          revenue: 0,
          cost,
          stock: Number(product?.stock || 0),
          minStock: Number(product?.min_stock || 0),
          unitType: product?.unit_type || "pza",
        };
        prev.qtySold += qty;
        prev.revenue += price * qty;
        productSales.set(item.sku, prev);
      }
    }

    const productMetrics = Array.from(productSales.values()).map((product) => {
      const estimatedCost = product.cost * product.qtySold;
      const grossProfit = product.revenue - estimatedCost;
      const availableBase = Math.max(product.stock + product.qtySold, 1);
      const rotation = (product.qtySold / availableBase) * 100;
      return {
        ...product,
        grossProfit,
        marginPct: product.revenue > 0 ? (grossProfit / product.revenue) * 100 : 0,
        rotation,
      };
    });

    const totalStockValue = (productRows as any[]).reduce(
      (sum, product) => sum + Number(product.stock || 0) * Number(product.cost || 0),
      0
    );
    const outOfStock = (productRows as any[]).filter((p) => Number(p.stock) === 0).length;
    const lowStock = (productRows as any[]).filter((p) => {
      const stock = Number(p.stock || 0);
      const min = Number(p.min_stock || 0);
      return stock > 0 && min > 0 && stock <= min;
    }).length;
    const excessStock = (productRows as any[]).filter((p) => {
      const stock = Number(p.stock || 0);
      const min = Number(p.min_stock || 0);
      return min > 0 && stock > min * 3;
    }).length;

    const categoryMap = new Map<string, { category: string; stockValue: number; units: number; products: number }>();
    for (const product of productRows as any[]) {
      const category = product.category || "GEN";
      const prev = categoryMap.get(category) || { category, stockValue: 0, units: 0, products: 0 };
      prev.stockValue += Number(product.stock || 0) * Number(product.cost || 0);
      prev.units += Number(product.stock || 0);
      prev.products += 1;
      categoryMap.set(category, prev);
    }

    const totalRevenue = productMetrics.reduce((sum, product) => sum + product.revenue, 0);
    const grossProfit = productMetrics.reduce((sum, product) => sum + product.grossProfit, 0);

    return c.json({
      currentDay: {
        date,
        totalSales: summary?.totalSales || 0,
        totalTickets: summary?.totalTickets || 0,
        totalItems: summary?.totalItems || 0,
        totalDiscount: summary?.totalDiscount || 0,
        totalTax: summary?.totalTax || 0,
        averageReceived: summary?.averageReceived || 0,
      },
      salesByDay,
      salesByMethod,
      topProducts: productMetrics
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
      rotation: [...productMetrics]
        .filter((p) => p.unitType !== "servicio")
        .sort((a, b) => b.rotation - a.rotation)
        .slice(0, 8),
      money: {
        revenue: totalRevenue,
        grossProfit,
        marginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        tax: Number(summary?.totalTax || 0),
        averageTicket: Number(summary?.totalTickets || 0) > 0
          ? Number(summary?.totalSales || 0) / Number(summary?.totalTickets || 1)
          : 0,
      },
      inventory: {
        totalProducts: productRows.length,
        stockValue: totalStockValue,
        outOfStock,
        lowStock,
        excessStock,
        healthy: Math.max(productRows.length - outOfStock - lowStock - excessStock, 0),
        categories: Array.from(categoryMap.values()).sort((a, b) => b.stockValue - a.stockValue),
      },
      hourlySales: hourly,
      dailyReport,
      clients,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch KPIs" }, 500);
  }
});

kpisRoutes.get("/products", requireRole("admin"), async (c) => {
  try {
    const sql = getSql();
    const allProducts = await sql`
      SELECT sku, name, price, stock, min_stock, category, unit_type
      FROM products
      WHERE active = 1
    `;

    const totalProducts = allProducts.length;
    const outOfStock = allProducts.filter(p => Number(p.stock) === 0).length;
    const lowStock = allProducts.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min_stock)).length;

    const topProducts = allProducts
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, 20)
      .map((row: any) => ({
        sku: row.sku,
        name: row.name,
        price: row.price,
        stock: row.stock,
        category: row.category,
        unit_type: row.unit_type,
        status: Number(row.stock) === 0 ? 'out' :
                Number(row.stock) <= Number(row.min_stock) ? 'low' : 'good',
      }));

    return c.json({
      summary: {
        totalProducts,
        lowStock,
        outOfStock,
      },
      products: topProducts,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch product KPIs" }, 500);
  }
});

kpisRoutes.get("/users", requireRole("admin"), async (c) => {  
  try {
    const sql = getSql();
    const usersRows = await sql`SELECT id, username, name, role, active, created_at FROM users WHERE active = 1 ORDER BY created_at DESC LIMIT 20`;
    const users = usersRows.map((row: any) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      active: Boolean(row.active),
      created_at: row.created_at,
    }));

    const activeUsersCount = await sql`SELECT COUNT(*)::int as count FROM users WHERE active = 1`;
    const totalUsers = activeUsersCount[0]?.count || 0;

    return c.json({
      users,
      total: totalUsers,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch user KPIs" }, 500);
  }
});
