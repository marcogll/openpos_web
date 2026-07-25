import { Hono } from "hono";
import { getRawDb } from "../webDb";

export const importRoutes = new Hono();
const VALID_UNIT_TYPES = new Set(["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"]);

// ── Products import ──────────────────────────────────────────────────────

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
    const existingRows = await db.all("SELECT sku FROM products") as any[];
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
          await db.run(
            `UPDATE products SET name = $1, price = $2, cost = $3, category = $4, stock = $5, min_stock = $6, unit_type = $7, barcode = $8, updated_at = NOW()::text
             WHERE sku = $9`,
            [name, price, cost, category, stock, minStock, unitType, barcode, sku]
          );
          updated.push(sku);
        }
        // If not updating, just skip silently
      } else {
        await db.run(
          `INSERT INTO products (sku, name, price, cost, category, stock, min_stock, unit_type, barcode, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW()::text, NOW()::text)`,
          [sku, name, price, cost, category, stock, minStock, unitType, barcode]
        );
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

// ── Clients import ───────────────────────────────────────────────────────

function validateClientRow(row: any, lineNum: number): string | null {
  const rfc = String(row.rfc || "").trim();
  const razonSocial = String(row.razonSocial || row.razonsocial || row.razon_social || row.nombre || "").trim();

  if (!rfc) return `Línea ${lineNum}: RFC vacío`;
  if (!razonSocial) return `Línea ${lineNum}: nombre/razón social vacío`;
  if (!/^[A-Z&Ñ0-9]{10,13}$/i.test(rfc)) return `Línea ${lineNum}: RFC inválido`;
  return null;
}

async function getNextClientCode(db: ReturnType<typeof getRawDb>, usedCodes: Set<string>) {
  const row = await db.get("SELECT code FROM clients ORDER BY id DESC LIMIT 1") as any;
  let next = 1;
  if (row?.code) {
    const parsed = Number.parseInt(String(row.code).replace("CL-", ""), 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }

  let code = `CL-${String(next).padStart(5, "0")}`;
  while (usedCodes.has(code)) {
    next += 1;
    code = `CL-${String(next).padStart(5, "0")}`;
  }
  usedCodes.add(code);
  return code;
}

importRoutes.post("/clients", async (c) => {
  try {
    const body = await c.req.json();
    const { rows, updateExisting } = body as { rows: any[]; updateExisting: boolean };

    if (!Array.isArray(rows) || rows.length === 0) {
      return c.json({ error: "No rows provided" }, 400);
    }

    const db = getRawDb();
    const existingRows = await db.all("SELECT rfc, code FROM clients") as any[];
    const existingRfcs = new Set(existingRows.map((r: any) => String(r.rfc).toUpperCase()));
    const usedCodes = new Set(existingRows.map((r: any) => String(r.code)));
    const seenRfcs = new Set<string>();

    const created: string[] = [];
    const updated: string[] = [];
    const rejected: { line: number; rfc: string; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;
      const rfc = String(row.rfc || "").trim().toUpperCase();

      const error = validateClientRow(row, lineNum);
      if (error) {
        rejected.push({ line: lineNum, rfc, reason: error });
        continue;
      }
      if (seenRfcs.has(rfc)) {
        rejected.push({ line: lineNum, rfc, reason: "RFC duplicado en archivo" });
        continue;
      }
      seenRfcs.add(rfc);

      const razonSocial = String(row.razonSocial || row.razonsocial || row.razon_social || row.nombre).trim();
      const email = row.email ? String(row.email).trim() : null;
      const telefono = row.telefono ? String(row.telefono).trim() : null;
      const direccion = row.direccion ? String(row.direccion).trim() : null;
      const regimenFiscal = row.regimenFiscal || row.regimenfiscal || row.regimen_fiscal
        ? String(row.regimenFiscal || row.regimenfiscal || row.regimen_fiscal).trim()
        : null;
      const puntos = Number.parseFloat(row.puntos) || 0;
      const exists = existingRfcs.has(rfc);

      if (exists) {
        if (updateExisting) {
          await db.run(
            `UPDATE clients
             SET razon_social = $1, email = $2, telefono = $3, direccion = $4, regimen_fiscal = $5, puntos = $6, updated_at = NOW()::text
             WHERE rfc = $7`,
            [razonSocial, email, telefono, direccion, regimenFiscal, puntos, rfc]
          );
          updated.push(rfc);
        }
        continue;
      }

      const requestedCode = row.code ? String(row.code).trim() : "";
      const code = requestedCode && !usedCodes.has(requestedCode)
        ? requestedCode
        : await getNextClientCode(db, usedCodes);
      usedCodes.add(code);

      await db.run(
        `INSERT INTO clients (code, rfc, razon_social, email, telefono, direccion, regimen_fiscal, puntos, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()::text, NOW()::text)`,
        [code, rfc, razonSocial, email, telefono, direccion, regimenFiscal, puntos]
      );
      created.push(rfc);
      existingRfcs.add(rfc);
    }

    return c.json({
      created: created.length,
      updated: updated.length,
      rejected: rejected.length,
      errors: rejected,
      createdRfcs: created,
      updatedRfcs: updated,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Import failed" }, 500);
  }
});

// ── Sales import ─────────────────────────────────────────────────────────

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
    const existingTicketsRows = await db.all("SELECT ticket FROM sales") as any[];
    const existingTickets = new Set(existingTicketsRows.map((r: any) => r.ticket));

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
      await db.run(
        `INSERT INTO sales (ticket, subtotal, tax, discount, total, received, change, method, status, items, item_count, created_at, created_by)
         VALUES ($1, $2, $3, 0, $4, $5, 0, $6, 'completed', $7, $8, $9, $10)`,
        [
          ticket,
          Math.round(subtotal * 100) / 100,
          Math.round(tax * 100) / 100,
          Math.round(total * 100) / 100,
          total,
          method,
          JSON.stringify(t.items),
          t.items.length,
          t.createdAt,
          t.createdBy || "import",
        ]
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
