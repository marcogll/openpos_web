import { Hono } from "hono";
import { getRawDb } from "../webDb";

export const importRoutes = new Hono();
const VALID_UNIT_TYPES = new Set(["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"]);

// ── Products import ──────────────────────────────────────────────────────────

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  unitType: string;
  minStock: number;
  barcode: string | null;
};

function validateProductRow(row: any, lineNum: number): string | null {
  if (!row.sku || typeof row.sku !== "string" || !row.sku.trim()) {
    return `Línea ${lineNum}: SKU vacío`;
  }
  if (!row.name || typeof row.name !== "string" || !row.name.trim()) {
    return `Línea ${lineNum}: Nombre vacío`;
  }
  const price = parseFloat(row.price);
  if (isNaN(price) || price < 0) {
    return `Línea ${lineNum}: Precio inválido`;
  }
  const unitType = String(row.unitType || row.unittype || "pza").trim().toLowerCase();
  if (!VALID_UNIT_TYPES.has(unitType)) {
    return `Línea ${lineNum}: Unidad inválida`;
  }
  return null;
}

importRoutes.post("/products", async (c) => {
  try {
    const body = await c.req.json();
    const { rows, updateExisting } = body as { rows: any[]; updateExisting: boolean };

    if (!Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: "No rows provided" }, 400);
    }

    const db = getRawDb();
    const created: string[] = [];
    const updated: string[] = [];
    const rejected: { line: number; sku: string; reason: string }[] = [];

    // Get existing SKUs
    const existingRows = db.prepare("SELECT sku FROM products").all() as any[];
    const existingSkus = new Set(existingRows.map((r: any) => r.sku));

    // Check for duplicate SKUs within the file
    const seenSkus = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;
      const sku = String(row.sku || "").trim();

      // Validate
      const error = validateProductRow(row, lineNum);
      if (error) {
        rejected.push({ line: lineNum, sku, reason: error });
        continue;
      }

      // Check duplicate in file
      if (seenSkus.has(sku)) {
        rejected.push({ line: lineNum, sku, reason: `SKU duplicado en archivo` });
        continue;
      }
      seenSkus.add(sku);

      const price = parseFloat(row.price) || 0;
      const cost = parseFloat(row.cost) || 0;
      const stock = parseFloat(row.stock) || 0;
      const minStock = row.minStock === 0 || row.minStock ? parseFloat(row.minStock) : 5;
      const category = String(row.category || "GEN").trim();
      const unitType = String(row.unitType || row.unittype || "pza").trim().toLowerCase();
      const barcode = row.barcode ? String(row.barcode).trim() : null;
      const name = String(row.name).trim();

      const existsInDb = existingSkus.has(sku);

      if (existsInDb) {
        if (updateExisting) {
          db.prepare(
            `UPDATE products SET name = ?, price = ?, cost = ?, category = ?, stock = ?, min_stock = ?, unit_type = ?, barcode = ?, updated_at = datetime('now')
             WHERE sku = ?`
          ).run(name, price, cost, category, stock, minStock, unitType, barcode, sku);
          updated.push(sku);
        }
        // If not updating, just skip silently
      } else {
        db.prepare(
          `INSERT INTO products (sku, name, price, cost, category, stock, min_stock, unit_type, barcode, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(sku, name, price, cost, category, stock, minStock, unitType, barcode);
        created.push(sku);
        existingSkus.add(sku); // prevent duplicates within same batch
      }
    }

    return c.json({
      created: created.length,
      updated: updated.length,
      rejected: rejected.length,
      errors: rejected,
      createdSkus: created,
      updatedSkus: updated,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Import failed" }, 500);
  }
});

// ── Sales import ─────────────────────────────────────────────────────────────

type SaleTicket = {
  ticket: string;
  createdAt: string;
  method: string;
  items: { sku: string; name: string; qty: number; price: number }[];
  total: number;
  subtotal: number;
  tax: number;
  createdBy: string;
};

const VALID_METHODS = ["efectivo", "tarjeta", "transf.", "qr/codi", "otro"];

importRoutes.post("/sales", async (c) => {
  try {
    const body = await c.req.json();
    const { tickets } = body as { tickets: SaleTicket[] };

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return c.json({ error: "No tickets provided" }, 400);
    }

    const db = getRawDb();

    // Get existing ticket numbers
    const existingTickets = new Set(
      (db.prepare("SELECT ticket FROM sales").all() as any[]).map((r: any) => r.ticket)
    );

    const imported: string[] = [];
    const rejected: { ticket: string; reason: string }[] = [];

    for (const t of tickets) {
      const ticket = String(t.ticket || "").trim();

      if (!ticket) {
        rejected.push({ ticket: "(vacío)", reason: "Ticket vacío" });
        continue;
      }

      if (existingTickets.has(ticket)) {
        rejected.push({ ticket, reason: "Ticket duplicado" });
        continue;
      }

      if (!t.createdAt || isNaN(Date.parse(t.createdAt))) {
        rejected.push({ ticket, reason: "Fecha inválida" });
        continue;
      }

      const method = String(t.method || "").toLowerCase();
      if (!VALID_METHODS.includes(method)) {
        rejected.push({ ticket, reason: `Método inválido: ${t.method}` });
        continue;
      }

      if (!Array.isArray(t.items) || t.items.length === 0) {
        rejected.push({ ticket, reason: "Sin items" });
        continue;
      }

      // Validate amounts
      const subtotal = typeof t.subtotal === "number" ? t.subtotal : t.items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = typeof t.tax === "number" ? t.tax : 0;
      const total = typeof t.total === "number" ? t.total : subtotal + tax;

      if (total < 0) {
        rejected.push({ ticket, reason: "Total inválido" });
        continue;
      }

      // Insert sale
      db.prepare(
        `INSERT INTO sales (ticket, subtotal, tax, discount, total, received, change, method, status, items, item_count, created_at, created_by)
         VALUES (?, ?, ?, 0, ?, ?, 0, ?, 'completed', ?, ?, ?, ?)`
      ).run(
        ticket,
        Math.round(subtotal * 100) / 100,
        Math.round(tax * 100) / 100,
        Math.round(total * 100) / 100,
        total,
        method,
        JSON.stringify(t.items),
        t.items.length,
        t.createdAt,
        t.createdBy || "import"
      );

      imported.push(ticket);
      existingTickets.add(ticket);
    }

    return c.json({
      imported: imported.length,
      rejected: rejected.length,
      errors: rejected,
      importedTickets: imported,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Import failed" }, 500);
  }
});
