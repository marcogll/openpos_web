import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://openpos:openpos123@localhost:5432/openpos";

let sql: ReturnType<typeof postgres>;
let _initialized = false;

function getSql() {
  if (!sql) {
    sql = postgres(DATABASE_URL, { max: 10 });
  }
  return sql;
}

export const CONFIG_KEYS = {
  LAST_TICKET: "lastTicketNum",
  STORE_NAME: "storeName",
  STORE_RFC: "storeRfc",
  STORE_ADDRESS: "storeAddress",
  STORE_LEGAL_NAME: "storeLegalName",
  STORE_EMAIL: "storeEmail",
  STORE_PHONE: "storePhone",
  STORE_REGIMEN: "storeRegimen",
  TAX_RATE: "taxRate",
  PRINTER_ENABLED: "printerEnabled",
  PRINTER_REQUIRED: "printerRequired",
  PRINTER_TYPE: "printerType",
  PRINTER_INTERFACE: "printerInterface",
  PRINTER_WIDTH: "printerWidth",
  PRINTER_CHARACTER_SET: "printerCharacterSet",
  RECEIPT_PROMPT_ON_SALE: "receiptPromptOnSale",
  RECEIPT_DEFAULT_DELIVERY: "receiptDefaultDelivery",
  BILLING_API_KEY: "billingApiKey",
  BILLING_PROVIDER: "billingProvider",
  BILLING_SANDBOX: "billingSandbox",
  TERMS_ACCEPTED: "termsAccepted",
  TELEGRAM_BOT_TOKEN: "telegramBotToken",
  TELEGRAM_WEBHOOK_SECRET: "telegramWebhookSecret",
} as const;

export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS];

export async function getConfig(key: string): Promise<string | null> {
  try {
    const rows = await getSql()`SELECT value FROM config WHERE key = ${key}`;
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function setConfig(key: string, value: string): Promise<boolean> {
  try {
    await getSql()`INSERT INTO config (key, value, updated_at) VALUES (${key}, ${value}, NOW()::text)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`;
    return true;
  } catch {
    return false;
  }
}

export async function getStoreConfig() {
  return {
    name: await getConfig(CONFIG_KEYS.STORE_NAME) || "MI TIENDA",
    rfc: await getConfig(CONFIG_KEYS.STORE_RFC) || "XAXX010101000",
    address: await getConfig(CONFIG_KEYS.STORE_ADDRESS) || "Sin dirección",
    legalName: await getConfig(CONFIG_KEYS.STORE_LEGAL_NAME) || "Mi Tienda SA de CV",
    email: await getConfig(CONFIG_KEYS.STORE_EMAIL) || "",
    phone: await getConfig(CONFIG_KEYS.STORE_PHONE) || "",
    regimen: await getConfig(CONFIG_KEYS.STORE_REGIMEN) || "601",
    taxRate: parseFloat(await getConfig(CONFIG_KEYS.TAX_RATE) || "16"),
    printerEnabled: await getConfig(CONFIG_KEYS.PRINTER_ENABLED) === "true",
  };
}

// Legacy db proxy (used by TUI imports, not functional in PG mode)
export const db = new Proxy({} as any, {
  get(_target, prop) {
    throw new Error(`db.${String(prop)} called — use PostgreSQL webDb for web mode`);
  },
});

export async function getActiveUsers(): Promise<Array<{ id: number; username: string; pin: string; name: string; role: string; active: number }>> {
  const rows = await getSql()`SELECT id, username, pin, name, role, active FROM users WHERE active = 1`;
  return rows as any;
}

export async function initDb() {
  if (_initialized) return;
  _initialized = true;
  const s = getSql();
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (NOW()::text)
    )
  `);
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS products (
      id         SERIAL PRIMARY KEY,
      barcode    TEXT UNIQUE,
      sku        TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      price      DOUBLE PRECISION NOT NULL,
      cost       DOUBLE PRECISION DEFAULT 0,
      category   TEXT NOT NULL DEFAULT 'GEN',
      stock      DOUBLE PRECISION NOT NULL DEFAULT 0,
      min_stock  DOUBLE PRECISION DEFAULT 5,
      unit_type  TEXT NOT NULL DEFAULT 'pza',
      unit_qty   DOUBLE PRECISION DEFAULT 1,
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text)
    )
  `);
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS sales (
      id         SERIAL PRIMARY KEY,
      ticket     TEXT NOT NULL,
      subtotal   DOUBLE PRECISION NOT NULL,
      tax        DOUBLE PRECISION NOT NULL,
      discount   DOUBLE PRECISION DEFAULT 0,
      total      DOUBLE PRECISION NOT NULL,
      received   DOUBLE PRECISION DEFAULT 0,
      change     DOUBLE PRECISION DEFAULT 0,
      method     TEXT NOT NULL,
      status     TEXT DEFAULT 'completed',
      items      TEXT NOT NULL,
      item_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT DEFAULT 'admin',
      customer_rfc TEXT,
      customer_razon_social TEXT,
      customer_email TEXT,
      customer_direccion TEXT,
      cfdi_uuid TEXT,
      cfdi_status TEXT DEFAULT 'none',
      cfdi_pdf_url TEXT,
      cfdi_error TEXT
    )
  `);
  try {
    await s.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_ticket_unique ON sales(ticket)`);
  } catch {
    await s.unsafe(`CREATE INDEX IF NOT EXISTS idx_sales_ticket ON sales(ticket)`);
  }
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      pin        TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'cashier',
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text)
    )
  `);
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS clients (
      id            SERIAL PRIMARY KEY,
      code          TEXT NOT NULL UNIQUE,
      rfc           TEXT NOT NULL UNIQUE,
      razon_social  TEXT NOT NULL,
      email         TEXT,
      telefono      TEXT,
      direccion     TEXT,
      regimen_fiscal TEXT,
      puntos        DOUBLE PRECISION DEFAULT 0,
      created_at    TEXT DEFAULT (NOW()::text),
      updated_at    TEXT DEFAULT (NOW()::text)
    )
  `);
}

export async function getClientByRfc(rfc: string): Promise<any | null> {
  try {
    const rows = await getSql()`SELECT * FROM clients WHERE rfc = ${rfc}`;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getClientByCode(code: string): Promise<any | null> {
  try {
    const rows = await getSql()`SELECT * FROM clients WHERE code = ${code}`;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export interface CreateClientData {
  rfc: string;
  razonSocial: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  regimenFiscal?: string;
}

export async function getOrCreateClient(data: CreateClientData) {
  const existing = await getClientByRfc(data.rfc);
  if (existing) return existing;

  const s = getSql();
  const codeRows = await s`SELECT code FROM clients ORDER BY id DESC LIMIT 1`;
  let nextCode = "CL-00001";
  if (codeRows.length > 0) {
    const lastNum = parseInt(codeRows[0].code.replace("CL-", ""), 10);
    nextCode = `CL-${String(lastNum + 1).padStart(5, "0")}`;
  }

  const now = new Date().toISOString();
  await s`INSERT INTO clients (code, rfc, razon_social, email, telefono, direccion, regimen_fiscal, created_at, updated_at)
    VALUES (${nextCode}, ${data.rfc}, ${data.razonSocial}, ${data.email ?? null}, ${data.telefono ?? null}, ${data.direccion ?? null}, ${data.regimenFiscal ?? null}, ${now}, ${now})`;

  return getClientByRfc(data.rfc)!;
}

export async function listClients(search?: string) {
  try {
    const s = getSql();
    if (search) {
      return await s`SELECT * FROM clients WHERE rfc LIKE ${'%' + search + '%'} OR 
        razon_social LIKE ${'%' + search + '%'} OR 
        email LIKE ${'%' + search + '%'} OR
        code LIKE ${'%' + search + '%'}
        ORDER BY razon_social ASC`;
    }
    return await s`SELECT * FROM clients ORDER BY razon_social ASC`;
  } catch {
    return [];
  }
}

export async function updateClientPoints(rfc: string, puntos: number): Promise<boolean> {
  try {
    await getSql()`UPDATE clients SET puntos = ${puntos}, updated_at = NOW()::text WHERE rfc = ${rfc}`;
    return true;
  } catch {
    return false;
  }
}
