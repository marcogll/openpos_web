import { hashPin } from "../../shared/src/auth/pin";
import { getSql, initDb } from "./webDb";

const nowIso = () => new Date().toISOString();
const dateFromBase = (baseDate: string, days: number, hour = 12, minute = 0) => {
  const d = new Date(`${baseDate}T00:00:00.000Z`);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const products = [
  { barcode: "7509000100018", sku: "KIT001", name: "Kit Alumna Maquillaje Basico", price: 1250, cost: 720, category: "KIT", stock: 18, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7509000100025", sku: "KIT002", name: "Kit Uñas Acrilico Inicial", price: 980, cost: 560, category: "KIT", stock: 14, minStock: 4, unitType: "pza", unitQty: 1 },
  { barcode: "7509000100032", sku: "KIT003", name: "Kit Barberia Practica", price: 1450, cost: 860, category: "KIT", stock: 8, minStock: 3, unitType: "pza", unitQty: 1 },
  { barcode: "7509100100017", sku: "COS001", name: "Base Liquida Profesional 30ml", price: 320, cost: 145, category: "COS", stock: 26, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7509100100024", sku: "COS002", name: "Paleta Sombras Academia 18 tonos", price: 540, cost: 260, category: "COS", stock: 12, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7509100100031", sku: "COS003", name: "Labial Mate Practica", price: 160, cost: 62, category: "COS", stock: 34, minStock: 10, unitType: "pza", unitQty: 1 },
  { barcode: "7509200100016", sku: "UNA001", name: "Gel Builder Transparente 30g", price: 210, cost: 84, category: "UNA", stock: 20, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7509200100023", sku: "UNA002", name: "Tips Full Cover Caja 240 pzas", price: 95, cost: 34, category: "UNA", stock: 42, minStock: 12, unitType: "pza", unitQty: 1 },
  { barcode: "7509200100030", sku: "UNA003", name: "Liquido Monomero 250ml", price: 180, cost: 74, category: "UNA", stock: 6, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7509300100015", sku: "HER001", name: "Set Brochas Profesional 12 pzas", price: 390, cost: 165, category: "HER", stock: 16, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7509300100022", sku: "HER002", name: "Lampara LED Uñas 48W", price: 620, cost: 330, category: "HER", stock: 4, minStock: 4, unitType: "pza", unitQty: 1 },
  { barcode: "7509300100039", sku: "HER003", name: "Cabeza Maniqui Cabello Natural", price: 780, cost: 430, category: "HER", stock: 9, minStock: 3, unitType: "pza", unitQty: 1 },
  { barcode: "7509400100014", sku: "MAT001", name: "Manual Colorimetria Nivel 1", price: 220, cost: 75, category: "MAT", stock: 35, minStock: 10, unitType: "pza", unitQty: 1 },
  { barcode: "7509400100021", sku: "MAT002", name: "Cuaderno Practicas Maquillaje", price: 140, cost: 48, category: "MAT", stock: 50, minStock: 15, unitType: "pza", unitQty: 1 },
  { barcode: "7509500100013", sku: "CUR001", name: "Inscripcion Curso Maquillaje", price: 1500, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7509500100020", sku: "CUR002", name: "Clase Individual Uñas", price: 650, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7509500100037", sku: "CUR003", name: "Practica Supervisada Barberia", price: 480, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
];

const clients = [
  { code: "CL-00001", rfc: "XAXX010101000", razonSocial: "Publico General", email: "mostrador@academiavanity.mx", telefono: "8180000000", direccion: "Av. Universidad 1200, Local 4, Monterrey, NL", regimenFiscal: "616", puntos: 0 },
  { code: "CL-00002", rfc: "JIMM980214K45", razonSocial: "Mariana Jimenez Martinez", email: "mariana.jimenez@example.com", telefono: "8112345601", direccion: "Calle Nogal 118, Col. Anahuac, San Nicolas de los Garza, NL", regimenFiscal: "605", puntos: 125 },
  { code: "CL-00003", rfc: "LOPP990711H22", razonSocial: "Paola Lopez Pena", email: "paola.lopez@example.com", telefono: "8112345602", direccion: "Av. Pablo Livas 402, Col. Camino Real, Guadalupe, NL", regimenFiscal: "605", puntos: 80 },
  { code: "CL-00004", rfc: "CAST850322M91", razonSocial: "Capelli Studio Monterrey SA de CV", email: "compras@capellistudio.example", telefono: "8112345603", direccion: "Paseo de los Leones 1550, Cumbres, Monterrey, NL", regimenFiscal: "601", puntos: 240 },
  { code: "CL-00005", rfc: "BEAU920505Q10", razonSocial: "Beauty Room Apodaca", email: "admin@beautyroom.example", telefono: "8112345604", direccion: "Av. Concordia 890, Centro, Apodaca, NL", regimenFiscal: "612", puntos: 310 },
  { code: "CL-00006", rfc: "GARR970829L31", razonSocial: "Regina Garcia Ramos", email: "regina.garcia@example.com", telefono: "8112345605", direccion: "Rio Panuco 221, Col. Del Valle, San Pedro Garza Garcia, NL", regimenFiscal: "605", puntos: 55 },
  { code: "CL-00007", rfc: "MORV960118P64", razonSocial: "Valeria Morales Vega", email: "valeria.morales@example.com", telefono: "8112345606", direccion: "Hidalgo 715, Centro, Santa Catarina, NL", regimenFiscal: "605", puntos: 160 },
  { code: "CL-00008", rfc: "NAVA880904S18", razonSocial: "Nava Barber Lab", email: "citas@navabarber.example", telefono: "8112345607", direccion: "Av. Revolucion 2030, Contry, Monterrey, NL", regimenFiscal: "612", puntos: 95 },
  { code: "CL-00009", rfc: "TORK910612D77", razonSocial: "Karla Torres Rios", email: "karla.torres@example.com", telefono: "8112345608", direccion: "Sendero Norte 510, Escobedo, NL", regimenFiscal: "605", puntos: 45 },
  { code: "CL-00010", rfc: "LUMS930310F20", razonSocial: "Luna Makeup Studio", email: "contacto@lunamakeup.example", telefono: "8112345609", direccion: "Calzada Madero 1444, Obrera, Monterrey, NL", regimenFiscal: "612", puntos: 275 },
];

const staleSeedRfcs = ["AUMJ980214K45", "AULP990711H22", "SALC850322M91"];

const users = [
  { username: "admin", name: "Administrador", email: null, pin: "1234", role: "admin" },
  { username: "ale", name: "Ale Ponce", email: "ale@vanityexpericne.mx", pin: "1608", role: "owner-admin" },
];

const sales = [
  {
    ticket: "TSEED001",
    method: "efectivo",
    days: 0,
    hour: 10,
    minute: 15,
    createdBy: "admin",
    customerRfc: "JIMM980214K45",
    items: [
      { sku: "KIT001", qty: 1 },
      { sku: "MAT002", qty: 2 },
    ],
  },
  {
    ticket: "TSEED002",
    method: "tarjeta",
    days: 0,
    hour: 13,
    minute: 30,
    createdBy: "admin",
    customerRfc: "CAST850322M91",
    items: [
      { sku: "COS002", qty: 2 },
      { sku: "HER001", qty: 1 },
      { sku: "CUR001", qty: 1 },
    ],
  },
  {
    ticket: "TSEED003",
    method: "transf.",
    days: 1,
    hour: 16,
    minute: 45,
    createdBy: "admin",
    customerRfc: "BEAU920505Q10",
    items: [
      { sku: "UNA001", qty: 3 },
      { sku: "UNA002", qty: 4 },
      { sku: "HER002", qty: 1 },
    ],
  },
  {
    ticket: "TSEED901",
    method: "efectivo",
    days: -1,
    hour: 9,
    minute: 45,
    createdBy: "admin",
    customerRfc: "JIMM980214K45",
    items: [
      { sku: "CUR001", qty: 1 },
      { sku: "MAT001", qty: 1 },
    ],
  },
  {
    ticket: "TSEED902",
    method: "tarjeta",
    days: -1,
    hour: 15,
    minute: 10,
    createdBy: "admin",
    customerRfc: "BEAU920505Q10",
    items: [
      { sku: "KIT003", qty: 1 },
      { sku: "HER003", qty: 1 },
    ],
  },
  {
    ticket: "TSEED004",
    method: "qr/codi",
    days: 2,
    hour: 11,
    minute: 20,
    createdBy: "admin",
    customerRfc: "LOPP990711H22",
    items: [
      { sku: "KIT002", qty: 1 },
      { sku: "CUR002", qty: 1 },
    ],
  },
  {
    ticket: "TSEED005",
    method: "tarjeta",
    days: 5,
    hour: 18,
    minute: 10,
    createdBy: "admin",
    customerRfc: "XAXX010101000",
    items: [
      { sku: "HER003", qty: 1 },
      { sku: "MAT001", qty: 2 },
      { sku: "COS003", qty: 2 },
    ],
  },
];

async function upsertProducts(sql: ReturnType<typeof getSql>) {
  for (const p of products) {
    const now = nowIso();
    await sql`
      INSERT INTO products (barcode, sku, name, price, cost, category, stock, min_stock, unit_type, unit_qty, active, created_at, updated_at)
      VALUES (${p.barcode}, ${p.sku}, ${p.name}, ${p.price}, ${p.cost}, ${p.category}, ${p.stock}, ${p.minStock}, ${p.unitType}, ${p.unitQty}, 1, ${now}, ${now})
      ON CONFLICT (sku) DO UPDATE SET
        barcode = EXCLUDED.barcode,
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        cost = EXCLUDED.cost,
        category = EXCLUDED.category,
        stock = EXCLUDED.stock,
        min_stock = EXCLUDED.min_stock,
        unit_type = EXCLUDED.unit_type,
        unit_qty = EXCLUDED.unit_qty,
        active = 1,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

async function upsertClients(sql: ReturnType<typeof getSql>) {
  for (const rfc of staleSeedRfcs) {
    await sql`DELETE FROM clients WHERE rfc = ${rfc}`;
  }

  for (const client of clients) {
    const now = nowIso();
    await sql`
      INSERT INTO clients (code, rfc, razon_social, email, telefono, direccion, regimen_fiscal, puntos, created_at, updated_at)
      VALUES (${client.code}, ${client.rfc}, ${client.razonSocial}, ${client.email}, ${client.telefono}, ${client.direccion}, ${client.regimenFiscal}, ${client.puntos}, ${now}, ${now})
      ON CONFLICT (rfc) DO UPDATE SET
        code = EXCLUDED.code,
        razon_social = EXCLUDED.razon_social,
        email = EXCLUDED.email,
        telefono = EXCLUDED.telefono,
        direccion = EXCLUDED.direccion,
        regimen_fiscal = EXCLUDED.regimen_fiscal,
        puntos = EXCLUDED.puntos,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

async function upsertUsers(sql: ReturnType<typeof getSql>) {
  const now = nowIso();
  for (const user of users) {
    await sql`
      INSERT INTO users (username, name, email, pin, role, active, created_at, updated_at)
      VALUES (${user.username}, ${user.name}, ${user.email}, ${hashPin(user.pin)}, ${user.role}, 1, ${now}, ${now})
      ON CONFLICT (username) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        pin = EXCLUDED.pin,
        role = EXCLUDED.role,
        active = 1,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

async function upsertSales(sql: ReturnType<typeof getSql>, baseDate: string) {
  for (const sale of sales) {
    const clientRows = await sql`SELECT rfc, razon_social, email FROM clients WHERE rfc = ${sale.customerRfc}`;
    const client = clientRows[0] as any;
    const saleItems: Array<{
      sku: string;
      name: string;
      price: number;
      qty: number;
      unitType: string;
      category: string;
    }> = [];
    let subtotal = 0;

    for (const item of sale.items) {
      const productRows = await sql`SELECT sku, name, price, category, unit_type FROM products WHERE sku = ${item.sku}`;
      const product = productRows[0] as any;
      if (!product) continue;

      subtotal += Number(product.price) * item.qty;
      saleItems.push({
        sku: product.sku,
        name: product.name,
        price: Number(product.price),
        qty: item.qty,
        unitType: product.unit_type,
        category: product.category,
      });
    }

    const tax = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    await sql`
      INSERT INTO sales (ticket, subtotal, tax, discount, total, received, change, method, status, items, item_count, created_at, created_by, customer_rfc, customer_razon_social, customer_email, cfdi_status)
      VALUES (${sale.ticket}, ${subtotal}, ${tax}, 0, ${total}, ${total}, 0, ${sale.method}, 'completed', ${JSON.stringify(saleItems)}, ${saleItems.length}, ${dateFromBase(baseDate, sale.days, sale.hour, sale.minute)}, ${sale.createdBy}, ${client?.rfc ?? null}, ${client?.razon_social ?? null}, ${client?.email ?? null}, 'none')
      ON CONFLICT (ticket) DO UPDATE SET
        subtotal = EXCLUDED.subtotal,
        tax = EXCLUDED.tax,
        total = EXCLUDED.total,
        received = EXCLUDED.received,
        method = EXCLUDED.method,
        status = EXCLUDED.status,
        items = EXCLUDED.items,
        item_count = EXCLUDED.item_count,
        created_at = EXCLUDED.created_at,
        created_by = EXCLUDED.created_by,
        customer_rfc = EXCLUDED.customer_rfc,
        customer_razon_social = EXCLUDED.customer_razon_social,
        customer_email = EXCLUDED.customer_email,
        cfdi_status = EXCLUDED.cfdi_status
    `;
  }

  await sql`
    INSERT INTO config (key, value, updated_at)
    VALUES ('lastTicketNum', '100', NOW()::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
}

async function seedInventoryMovements(sql: ReturnType<typeof getSql>, baseDate: string) {
  await sql`DELETE FROM inventory_movements WHERE note LIKE 'Seed academia:%'`;

  const movementData = [
    { sku: "KIT001", type: "entry", quantity: 18, previousStock: 0, newStock: 18, cost: 720, note: "Seed academia: compra inicial kits maquillaje", days: 6 },
    { sku: "KIT002", type: "entry", quantity: 14, previousStock: 0, newStock: 14, cost: 560, note: "Seed academia: compra inicial kits uñas", days: 6 },
    { sku: "UNA003", type: "adjustment", quantity: 6, previousStock: 10, newStock: 6, cost: null, note: "Seed academia: ajuste por merma practica", days: 2 },
    { sku: "HER002", type: "count", quantity: 4, previousStock: 5, newStock: 4, cost: null, note: "Seed academia: conteo fisico tienda", days: 1 },
    { sku: "MAT001", type: "entry", quantity: 35, previousStock: 0, newStock: 35, cost: 75, note: "Seed academia: material didactico", days: 0 },
  ];

  for (const movement of movementData) {
    const rows = await sql`SELECT id FROM products WHERE sku = ${movement.sku}`;
    const product = rows[0] as any;
    if (!product) continue;

    await sql`
      INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, cost, note, created_by, created_at)
      VALUES (${product.id}, ${movement.sku}, ${movement.type}, ${movement.quantity}, ${movement.previousStock}, ${movement.newStock}, ${movement.cost}, ${movement.note}, 'admin', ${dateFromBase(baseDate, movement.days, 9, 0)})
    `;
  }
}

export async function runSeed() {
  await initDb();
  const sql = getSql();
  const baseDate = new Date().toISOString().slice(0, 10);

  await upsertUsers(sql);
  await upsertProducts(sql);
  await upsertClients(sql);
  await upsertSales(sql, baseDate);
  await seedInventoryMovements(sql, baseDate);

  console.log(`Seed academia completado: ${products.length} productos, ${clients.length} clientes, ${sales.length} ventas y movimientos de inventario.`);
}

if (import.meta.main) {
  runSeed()
    .catch((err) => {
      console.error("Seed academia fallido:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await getSql().end({ timeout: 1 });
    });
}
