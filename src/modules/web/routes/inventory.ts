import { Hono } from "hono";
import { requireRole } from "../auth";
import { getRawDb, getLowStockProducts, getInventoryMovements, getInventoryDashboard, logAudit } from "../webDb";

export const inventoryRoutes = new Hono();

inventoryRoutes.get("/dashboard", async (c) => {
  try {
    const data = await getInventoryDashboard();
    return c.json(data);
  } catch {
    return c.json({ error: "Failed to fetch inventory dashboard" }, 500);
  }
});

inventoryRoutes.get("/low-stock", async (c) => {
  try {
    const items = await getLowStockProducts();
    return c.json({ items, total: items.length });
  } catch {
    return c.json({ error: "Failed to fetch low stock products" }, 500);
  }
});

inventoryRoutes.get("/", async (c) => {
  try {
    const productId = c.req.query("product_id") ? Number(c.req.query("product_id")) : undefined;
    const type = c.req.query("type") || undefined;
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit")) || 50));
    const offset = Math.max(0, Number(c.req.query("offset")) || 0);

    const result = await getInventoryMovements({ productId, type, limit, offset });
    return c.json(result);
  } catch {
    return c.json({ error: "Failed to fetch inventory movements" }, 500);
  }
});

inventoryRoutes.post("/adjustment", requireRole("admin"), async (c) => {
  try {
    const { sku, newStock, note } = await c.req.json();

    if (!sku || typeof sku !== "string") {
      return c.json({ error: "sku is required" }, 400);
    }
    if (newStock === undefined || typeof newStock !== "number" || newStock < 0) {
      return c.json({ error: "newStock must be a non-negative number" }, 400);
    }

    const db = getRawDb();
    const product = await db.get("SELECT * FROM products WHERE sku = $1 AND active = 1", [sku]) as any;
    if (!product) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }

    const previousStock = Number(product.stock);
    const user = (c as any).get("user")?.username || "admin";

    await db.run(
      `UPDATE products SET stock = $1, updated_at = NOW()::text WHERE sku = $2`,
      [newStock, sku]
    );

    await db.run(
      `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, note, created_by, created_at)
       VALUES ($1, $2, 'adjustment', $3, $4, $5, $6, $7, NOW()::text)`,
      [product.id, sku, newStock, previousStock, newStock, note || null, user]
    );

    const updated = await db.get("SELECT * FROM products WHERE sku = $1", [sku]);
    await logAudit({ entityType: "inventory", entityId: sku, action: "adjust_stock", changes: { previousStock, newStock, note }, performedBy: user });
    return c.json({ product: updated, movement: { previousStock, newStock } });
  } catch {
    return c.json({ error: "Failed to adjust stock" }, 500);
  }
});

inventoryRoutes.post("/count", requireRole("admin"), async (c) => {
  try {
    const { items, note } = await c.req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "items array is required" }, 400);
    }

    const db = getRawDb();
    const user = (c as any).get("user")?.username || "admin";
    const results: any[] = [];

    for (const item of items) {
      if (!item.sku || typeof item.countedStock !== "number") continue;

      const product = await db.get("SELECT * FROM products WHERE sku = $1 AND active = 1", [item.sku]) as any;
      if (!product) continue;

      const previousStock = Number(product.stock);
      const counted = Math.max(0, item.countedStock);

      if (counted === previousStock) continue;

      await db.run(
        `UPDATE products SET stock = $1, updated_at = NOW()::text WHERE sku = $2`,
        [counted, item.sku]
      );

      await db.run(
        `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, note, created_by, created_at)
         VALUES ($1, $2, 'count', $3, $4, $5, $6, $7, NOW()::text)`,
        [product.id, item.sku, counted, previousStock, counted, note || "Inventario físico", user]
      );

      results.push({ sku: item.sku, name: product.name, previousStock, newStock: counted, diff: counted - previousStock });
    }

    await logAudit({ entityType: "inventory", entityId: "count", action: "physical_count", changes: { itemsAdjusted: results.length, skus: results.map((r: any) => r.sku) }, performedBy: user });
    return c.json({ adjusted: results.length, items: results });
  } catch {
    return c.json({ error: "Failed to process physical count" }, 500);
  }
});

inventoryRoutes.post("/entry", requireRole("admin"), async (c) => {
  try {
    const { sku, quantity, cost, note } = await c.req.json();

    if (!sku || typeof sku !== "string") {
      return c.json({ error: "sku is required" }, 400);
    }
    if (!quantity || typeof quantity !== "number" || quantity <= 0) {
      return c.json({ error: "quantity must be a positive number" }, 400);
    }

    const db = getRawDb();
    const product = await db.get("SELECT * FROM products WHERE sku = $1 AND active = 1", [sku]) as any;
    if (!product) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }

    const previousStock = Number(product.stock);
    const newStock = previousStock + quantity;
    const user = (c as any).get("user")?.username || "admin";

    await db.run(
      `UPDATE products SET stock = $1, updated_at = NOW()::text WHERE sku = $2`,
      [newStock, sku]
    );

    if (cost !== undefined && typeof cost === "number" && cost >= 0) {
      await db.run(
        `UPDATE products SET cost = $1, updated_at = NOW()::text WHERE sku = $2`,
        [cost, sku]
      );
    }

    await db.run(
      `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, cost, note, created_by, created_at)
       VALUES ($1, $2, 'entry', $3, $4, $5, $6, $7, $8, NOW()::text)`,
      [product.id, sku, quantity, previousStock, newStock, cost ?? null, note || null, user]
    );

    const updated = await db.get("SELECT * FROM products WHERE sku = $1", [sku]);
    await logAudit({ entityType: "inventory", entityId: sku, action: "entry", changes: { previousStock, newStock, quantity, cost }, performedBy: user });
    return c.json({ product: updated, movement: { previousStock, newStock, added: quantity } });
  } catch {
    return c.json({ error: "Failed to register merchandise entry" }, 500);
  }
});
