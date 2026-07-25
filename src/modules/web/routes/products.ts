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

    const result = await searchProducts(q, offset, limit);

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
    const product = await db.get("SELECT * FROM products WHERE sku = $1", [sku]);

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
    const existing = await db.get("SELECT sku FROM products WHERE sku = $1", [sku]);
    if (existing) {
      return c.json({ error: "Product with this SKU already exists" }, 409);
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO products (sku, name, price, barcode, cost, category, stock, min_stock, unit_type, unit_qty, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12)`,
      [sku, name, price, barcode, cost, category, stock, minStock, unitType, unitQty, now, now]
    );

    const created = await db.get("SELECT * FROM products WHERE sku = $1", [sku]);
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

    const existing = await db.get("SELECT sku FROM products WHERE sku = $1", [sku]);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }

    const updates: string[] = ["updated_at = NOW()::text"];
    const values: any[] = [];

    const product = parsed.value;
    if (body.name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(product.name); }
    if (body.price !== undefined) { updates.push(`price = $${values.length + 1}`); values.push(product.price); }
    if (body.barcode !== undefined) { updates.push(`barcode = $${values.length + 1}`); values.push(product.barcode); }
    if (body.cost !== undefined) { updates.push(`cost = $${values.length + 1}`); values.push(product.cost); }
    if (body.category !== undefined) { updates.push(`category = $${values.length + 1}`); values.push(product.category); }
    if (body.stock !== undefined) { updates.push(`stock = $${values.length + 1}`); values.push(product.stock); }
    if (body.minStock !== undefined) { updates.push(`min_stock = $${values.length + 1}`); values.push(product.minStock); }
    if (body.unitType !== undefined) { updates.push(`unit_type = $${values.length + 1}`); values.push(product.unitType); }
    if (body.unitQty !== undefined) { updates.push(`unit_qty = $${values.length + 1}`); values.push(product.unitQty); }

    values.push(sku);
    await db.run(`UPDATE products SET ${updates.join(", ")} WHERE sku = $${values.length}`, values);

    const updated = await db.get("SELECT * FROM products WHERE sku = $1", [sku]);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update product" }, 500);
  }
});

productRoutes.delete("/:sku", requireRole("admin"), async (c) => {
  try {
    const sku = c.req.param("sku");
    const db = getRawDb();

    const existing = await db.get("SELECT sku FROM products WHERE sku = $1", [sku]);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }

    await db.run("UPDATE products SET active = 0, updated_at = NOW()::text WHERE sku = $1", [sku]);
    return c.json({ message: "Product deactivated" });
  } catch (err) {
    return c.json({ error: "Failed to delete product" }, 500);
  }
});
