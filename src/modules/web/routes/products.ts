import { Hono } from "hono";
import { requireRole } from "../auth";
import { getRawDb, searchProducts } from "../webDb";

export const productRoutes = new Hono();

const VALID_UNIT_TYPES = new Set(["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"]);

type ProductInput = {
  sku?: unknown;
  name?: unknown;
  price?: unknown;
  barcode?: unknown;
  cost?: unknown;
  category?: unknown;
  stock?: unknown;
  minStock?: unknown;
  unitType?: unknown;
  unitQty?: unknown;
};

const parseOptionalNumber = (value: unknown, fallback: number) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

function normalizeProductInput(body: ProductInput, partial = false) {
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = parseOptionalNumber(body.price, partial ? NaN : 0);
  const cost = parseOptionalNumber(body.cost, 0);
  const stock = parseOptionalNumber(body.stock, 0);
  const minStock = parseOptionalNumber(body.minStock, 5);
  const unitQty = parseOptionalNumber(body.unitQty, 1);
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().toUpperCase() : "GEN";
  const unitType = typeof body.unitType === "string" && body.unitType.trim() ? body.unitType.trim().toLowerCase() : "pza";
  const barcode = typeof body.barcode === "string" && body.barcode.trim() ? body.barcode.trim() : null;

  if (!partial && (!sku || !name || body.price === undefined)) {
    return { error: "sku, name, and price are required" };
  }
  if (sku && !/^[a-zA-Z0-9._-]+$/.test(sku)) return { error: "sku contains invalid characters" };
  if (body.name !== undefined && !name) return { error: "name is required" };
  if (body.price !== undefined && (!Number.isFinite(price) || price < 0)) return { error: "price must be zero or greater" };
  if (!Number.isFinite(cost) || cost < 0) return { error: "cost must be zero or greater" };
  if (!Number.isFinite(stock) || stock < 0) return { error: "stock must be zero or greater" };
  if (!Number.isFinite(minStock) || minStock < 0) return { error: "minStock must be zero or greater" };
  if (!Number.isFinite(unitQty) || unitQty <= 0) return { error: "unitQty must be greater than zero" };
  if (!VALID_UNIT_TYPES.has(unitType)) return { error: "unitType is invalid" };

  return { value: { sku, name, price, barcode, cost, category, stock, minStock, unitType, unitQty } };
}

productRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const result = searchProducts(q, offset, limit);

    return c.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

productRoutes.get("/:sku", async (c) => {
  try {
    const sku = c.req.param("sku");
    const db = getRawDb();
    const product = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(product);
  } catch (err) {
    return c.json({ error: "Failed to fetch product" }, 500);
  }
});

productRoutes.post("/", requireRole("admin"), async (c) => {
  try {
    const parsed = normalizeProductInput(await c.req.json());
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const { sku, name, price, barcode, cost, category, stock, minStock, unitType, unitQty } = parsed.value;

    const db = getRawDb();
    const existing = db.prepare("SELECT sku FROM products WHERE sku = ?").get(sku);
    if (existing) {
      return c.json({ error: "Product with this SKU already exists" }, 409);
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO products (sku, name, price, barcode, cost, category, stock, min_stock, unit_type, unit_qty, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(sku, name, price, barcode, cost, category, stock, minStock, unitType, unitQty, now, now);

    const created = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku);
    return c.json(created, 201);
  } catch (err) {
    return c.json({ error: "Failed to create product" }, 500);
  }
});

productRoutes.put("/:sku", requireRole("admin"), async (c) => {
  try {
    const sku = c.req.param("sku");
    const body = await c.req.json();
    const parsed = normalizeProductInput({ ...body, sku }, true);
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const db = getRawDb();

    const existing = db.prepare("SELECT sku FROM products WHERE sku = ?").get(sku);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }

    const updates: string[] = ["updated_at = datetime('now')"];
    const values: any[] = [];

    const product = parsed.value;
    if (body.name !== undefined) { updates.push("name = ?"); values.push(product.name); }
    if (body.price !== undefined) { updates.push("price = ?"); values.push(product.price); }
    if (body.barcode !== undefined) { updates.push("barcode = ?"); values.push(product.barcode); }
    if (body.cost !== undefined) { updates.push("cost = ?"); values.push(product.cost); }
    if (body.category !== undefined) { updates.push("category = ?"); values.push(product.category); }
    if (body.stock !== undefined) { updates.push("stock = ?"); values.push(product.stock); }
    if (body.minStock !== undefined) { updates.push("min_stock = ?"); values.push(product.minStock); }
    if (body.unitType !== undefined) { updates.push("unit_type = ?"); values.push(product.unitType); }
    if (body.unitQty !== undefined) { updates.push("unit_qty = ?"); values.push(product.unitQty); }

    values.push(sku);
    db.prepare(`UPDATE products SET ${updates.join(", ")} WHERE sku = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update product" }, 500);
  }
});

productRoutes.delete("/:sku", requireRole("admin"), async (c) => {
  try {
    const sku = c.req.param("sku");
    const db = getRawDb();

    const existing = db.prepare("SELECT sku FROM products WHERE sku = ?").get(sku);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }

    db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE sku = ?").run(sku);
    return c.json({ message: "Product deactivated" });
  } catch (err) {
    return c.json({ error: "Failed to delete product" }, 500);
  }
});
