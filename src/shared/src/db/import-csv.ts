import { readFileSync } from "fs";
import { db, initDb } from "./client.js";

const VALID_UNIT_TYPES = ["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"];

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vacío o sin encabezados");
  
  const headers = lines[0]!.split(",").map(h => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(",").map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  
  return rows;
}

function validateRow(row: Record<string, string>, lineNum: number): string | null {
  if (!row.sku) return `Línea ${lineNum}: Falta SKU`;
  if (!row.name) return `Línea ${lineNum}: Falta nombre`;
  if (!row.price || isNaN(parseFloat(row.price))) return `Línea ${lineNum}: Precio inválido`;
  if (row.unittype && !VALID_UNIT_TYPES.includes(row.unittype)) {
    return `Línea ${lineNum}: unitType inválido (use: pza, kg, g, lt, ml, m, cm, servicio)`;
  }
  return null;
}

export async function runImport(filePath: string) {
  console.log(`📂 Importando: ${filePath}`);

  initDb();

  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  
  console.log(`📊 ${rows.length} productos encontrados`);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const lineNum = i + 2;
    
    const error = validateRow(row, lineNum);
    if (error) {
      errors.push(error);
      continue;
    }

    const existing = await db.get("SELECT id FROM products WHERE sku = $1", [row.sku]);
    if (existing) {
      skipped++;
      console.log(`  ⏭️  ${row.sku} - ya existe`);
      continue;
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO products (barcode, sku, name, price, cost, category, stock, min_stock, unit_type, unit_qty, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [row.barcode || null, row.sku, row.name, parseFloat(row.price) || 0, parseFloat(row.cost) || 0, row.category || "GEN", parseFloat(row.stock) || 0, parseFloat(row.minstock) || 5, row.unittype || "pza", parseFloat(row.unitqty) || 1, 1, now, now]
    );
    inserted++;
    console.log(`  ✅ ${row.sku} - ${row.name}`);
  }

  console.log("\n📈 RESUMEN:");
  console.log(`   ✅ Insertados: ${inserted}`);
  console.log(`   ⏭️  Omitidos (ya existen): ${skipped}`);
  console.log(`   ❌ Errores: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log("\n❌ ERRORES:");
    errors.forEach(e => console.log(`   ${e}`));
  }
}
