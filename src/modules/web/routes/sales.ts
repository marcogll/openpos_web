import { Hono } from "hono";
import { getRawDb, getSql } from "../webDb";

export const salesRoutes = new Hono();

const TAX_RATE = 0.16;
const SERVICE_CATEGORY = "SER";
const SERVICE_UNIT_TYPE = "servicio";
const VALID_METHODS = new Set(["efectivo", "tarjeta", "transf.", "qr/codi", "otro"]);

type SaleItemInput = {
  sku?: string;
  qty?: number;
};

type ProductRow = {
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  unit_type: string;
};

type SaleItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  unitType: string;
  category: string;
};

class SaleRouteError extends Error {
  readonly status: 400 | 404;

  constructor(status: 400 | 404, message: string) {
    super(message);
    this.status = status;
  }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const isServiceProduct = (product: ProductRow) =>
  product.category?.toUpperCase() === SERVICE_CATEGORY ||
  product.unit_type?.toLowerCase() === SERVICE_UNIT_TYPE;

const getNextTicket = async (sql: ReturnType<typeof getSql>) => {
  const rows = await sql`SELECT value FROM config WHERE key = 'lastTicketNum'`;
  const row = rows[0] as { value?: string } | undefined;
  const current = Number.parseInt(row?.value || "1", 10);
  let next = Number.isFinite(current) && current > 0 ? current : 1;
  let ticket = `T${String(next).padStart(6, "0")}`;

  for (let attempts = 0; attempts < 10_000; attempts++) {
    const existing = await sql`SELECT 1 FROM sales WHERE ticket = ${ticket}`;
    if (existing.length === 0) break;
    next += 1;
    ticket = `T${String(next).padStart(6, "0")}`;
  }

  await sql`INSERT INTO config (key, value, updated_at) VALUES ('lastTicketNum', ${String(next + 1)}, NOW()::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`;

  return ticket;
};

salesRoutes.get("/", async (c) => {
  try {
    const sql = getSql();
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;
    const date = c.req.query("date");
    const method = c.req.query("method");
    const status = c.req.query("status");

    let items: any[];
    let countRow: any;

    if (date && method && status) {
      items = await sql`SELECT * FROM sales WHERE DATE(created_at::timestamp) = ${date} AND method = ${method} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE DATE(created_at::timestamp) = ${date} AND method = ${method} AND status = ${status}`)[0];
    } else if (date && method) {
      items = await sql`SELECT * FROM sales WHERE DATE(created_at::timestamp) = ${date} AND method = ${method} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE DATE(created_at::timestamp) = ${date} AND method = ${method}`)[0];
    } else if (date && status) {
      items = await sql`SELECT * FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE DATE(created_at::timestamp) = ${date} AND status = ${status}`)[0];
    } else if (method && status) {
      items = await sql`SELECT * FROM sales WHERE method = ${method} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE method = ${method} AND status = ${status}`)[0];
    } else if (date) {
      items = await sql`SELECT * FROM sales WHERE DATE(created_at::timestamp) = ${date} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE DATE(created_at::timestamp) = ${date}`)[0];
    } else if (method) {
      items = await sql`SELECT * FROM sales WHERE method = ${method} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE method = ${method}`)[0];
    } else if (status) {
      items = await sql`SELECT * FROM sales WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales WHERE status = ${status}`)[0];
    } else {
      items = await sql`SELECT * FROM sales ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      countRow = (await sql`SELECT COUNT(*)::int as count FROM sales`)[0];
    }

    return c.json({
      items: items.map((s: any) => ({ ...s, items: JSON.parse(s.items) })),
      total: countRow?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countRow?.count || 0) / limit),
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch sales" }, 500);
  }
});

salesRoutes.get("/:ticket", async (c) => {
  try {
    const sql = getSql();
    const ticket = c.req.param("ticket");
    const rows = await sql`SELECT * FROM sales WHERE ticket = ${ticket}`;
    const sale = rows[0] as any;
    if (!sale) return c.json({ error: "Sale not found" }, 404);
    return c.json({ ...sale, items: JSON.parse(sale.items) });
  } catch (err) {
    return c.json({ error: "Failed to fetch sale" }, 500);
  }
});

salesRoutes.post("/", async (c) => {
  try {
    const sql = getSql();
    const body = await c.req.json();
    const { items, method, received, discount, createdBy, customerRfc, customerRazonSocial, customerEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: "items array is required" }, 400);
    }
    if (!method || !VALID_METHODS.has(String(method))) {
      return c.json({ error: "payment method is required" }, 400);
    }

    for (const item of items as SaleItemInput[]) {
      const qty = Number(item.qty);
      if (!item.sku || !Number.isFinite(qty) || qty <= 0) {
        return c.json({ error: "each item requires sku and qty greater than zero" }, 400);
      }
    }

    const result = await sql.begin(async (tx) => {
      let subtotal = 0;
      const saleItems: SaleItem[] = [];

      for (const item of items as SaleItemInput[]) {
        const rows = await tx`SELECT sku, name, price, stock, category, unit_type FROM products WHERE sku = ${item.sku} AND active = 1`;
        const product = rows[0] as ProductRow | undefined;

        if (!product) {
          return { status: 404 as const, error: `Product ${item.sku} not found` };
        }

        const qty = Number(item.qty);
        const service = isServiceProduct(product);
        if (!service && product.stock < qty) {
          return { status: 400 as const, error: `Insufficient stock for ${product.name}` };
        }

        subtotal += product.price * qty;
        saleItems.push({
          sku: product.sku,
          name: product.name,
          price: product.price,
          qty,
          unitType: product.unit_type,
          category: product.category,
        });
      }

      const discountAmount = Number(discount) || 0;
      if (discountAmount < 0 || discountAmount > subtotal) {
        return { status: 400 as const, error: "discount must be between zero and subtotal" };
      }

      const taxableAmount = subtotal - discountAmount;
      const tax = roundMoney(taxableAmount * TAX_RATE);
      const total = roundMoney(taxableAmount + tax);
      const receivedAmount = received === undefined ? total : Number(received);
      if (!Number.isFinite(receivedAmount) || receivedAmount < total) {
        return { status: 400 as const, error: "received amount must cover total" };
      }
      const changeAmount = roundMoney(receivedAmount - total);

      const ticket = await getNextTicket(tx);
      const now = new Date().toISOString();

      for (const item of saleItems) {
        if (item.category.toUpperCase() === SERVICE_CATEGORY || item.unitType.toLowerCase() === SERVICE_UNIT_TYPE) {
          continue;
        }
        const updateResult = await tx`UPDATE products SET stock = stock - ${item.qty}, updated_at = ${now} WHERE sku = ${item.sku} AND stock >= ${item.qty}`;
        if (updateResult.count !== 1) {
          throw new SaleRouteError(400, `Insufficient stock for ${item.name}`);
        }
      }

      await tx`INSERT INTO sales (ticket, subtotal, tax, discount, total, received, change, method, status, items, item_count, created_at, created_by, customer_rfc, customer_razon_social, customer_email)
        VALUES (${ticket}, ${roundMoney(subtotal)}, ${tax}, ${discountAmount}, ${total}, ${receivedAmount}, ${changeAmount}, ${method}, 'completed', ${JSON.stringify(saleItems)}, ${saleItems.length}, ${now}, ${createdBy || "admin"}, ${customerRfc || null}, ${customerRazonSocial || null}, ${customerEmail || null})`;

      return { ticket };
    });

    if ("error" in result) return c.json({ error: result.error }, result.status);

    const created = await sql`SELECT * FROM sales WHERE ticket = ${result.ticket}`;
    return c.json({ ...created[0], items: JSON.parse(created[0].items) }, 201);
  } catch (err) {
    if (err instanceof SaleRouteError) {
      return c.json({ error: err.message }, err.status);
    }
    return c.json({ error: "Failed to create sale" }, 500);
  }
});
