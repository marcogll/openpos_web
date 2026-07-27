import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://openpos:openpos123@localhost:5432/openpos";

let pg: ReturnType<typeof postgres>;
let _initialized = false;

function getSql() {
  if (!pg) {
    pg = postgres(DATABASE_URL, { max: 10 });
  }
  return pg;
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

// ── Helpers ────────────────────────────────────────────────────────────

function toPg(sqlStr: string, params: any[] = []): { text: string; args: any[] } {
  let i = 0;
  const text = sqlStr.replace(/\?/g, () => `$${++i}`);
  return { text, args: params };
}

function extractCondition(condition: any): { sql: string; params: any[] } | null {
  if (!condition || typeof condition === "string") return null;
  if (condition._sql !== undefined) return { sql: condition._sql, params: condition._params || [] };
  const toSQL = condition.toSQL?.();
  if (toSQL?.sql) return toPg(toSQL.sql, toSQL.params || []);
  if (condition.sql !== undefined) return toPg(condition.sql, condition.params || []);
  return null;
}

function resolveSql(sqlOrObj: any, params?: any[]): { text: string; args: any[] } {
  if (typeof sqlOrObj === "string") return { text: sqlOrObj, args: params || [] };
  if (sqlOrObj && typeof sqlOrObj === "object") {
    if (sqlOrObj._sql !== undefined) return { text: sqlOrObj._sql, args: sqlOrObj._params || [] };
    const toSQL = sqlOrObj.toSQL?.();
    if (toSQL?.sql) return toPg(toSQL.sql, toSQL.params || []);
    if (sqlOrObj.sql !== undefined) return toPg(sqlOrObj.sql, sqlOrObj.params || []);
  }
  return { text: String(sqlOrObj), args: params || [] };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function tableName(table: any): string {
  return table?._?.name || table?.name || "unknown";
}

// ── Builder: SELECT ────────────────────────────────────────────────────

class PgSelectBuilder {
  private _table: any;
  private _fields: any;
  private _conditions: string[] = [];
  private _params: any[] = [];
  private _orderBy: string = "";
  private _limitVal: number = 0;
  private _offsetVal: number = 0;
  private _groupBy: string = "";

  constructor(fields?: any) { this._fields = fields; }

  from(table: any) { this._table = table; return this; }

  where(condition: any) {
    const resolved = extractCondition(condition);
    if (resolved) {
      let offset = this._params.length;
      const sql = resolved.sql.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);
      this._conditions.push(sql);
      this._params.push(...resolved.params);
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  orderBy(...args: any[]) {
    for (const arg of args) {
      if (typeof arg === "string") this._orderBy = arg;
    }
    return this;
  }

  groupBy(...args: any[]) {
    for (const arg of args) {
      if (typeof arg === "string") this._groupBy = arg;
    }
    return this;
  }

  limit(n: number) { this._limitVal = n; return this; }
  offset(n: number) { this._offsetVal = n; return this; }

  private _build(): { text: string; args: any[] } {
    const t = tableName(this._table);
    let q = `SELECT * FROM "${t}"`;
    if (this._conditions.length > 0) q += ` WHERE ${this._conditions.join(" AND ")}`;
    if (this._groupBy) q += ` GROUP BY ${this._groupBy}`;
    if (this._orderBy) q += ` ORDER BY ${this._orderBy}`;
    if (this._limitVal > 0) q += ` LIMIT ${this._limitVal}`;
    if (this._offsetVal > 0) q += ` OFFSET ${this._offsetVal}`;
    return { text: q, args: this._params };
  }

  async all() {
    const { text, args } = this._build();
    return getSql().unsafe(text, args);
  }

  async get() {
    const rows = await this.all();
    return rows[0] ?? undefined;
  }

  then(resolve: any, reject?: any) { return this.all().then(resolve, reject); }
}

// ── Builder: INSERT ────────────────────────────────────────────────────

class PgInsertBuilder {
  private _table: any;
  private _values: any = {};
  private _onConflict: any;

  constructor(table: any) { this._table = table; }

  values(data: any) { this._values = data; return this; }

  onConflictDoUpdate(config: any) { this._onConflict = config; return this; }

  async run() {
    const t = tableName(this._table);
    const keys = Object.keys(this._values);
    const cols = keys.map((k) => `"${camelToSnake(k)}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => this._values[k]);

    if (this._onConflict) {
      const target = camelToSnake(this._onConflict.target);
      const setFields = this._onConflict.set;
      const setKeys = Object.keys(setFields);
      const setClause = setKeys.map((k, i) => `"${camelToSnake(k)}" = $${keys.length + i + 1}`).join(", ");
      const setValues = setKeys.map((k) => setFields[k]);
      const q = `INSERT INTO "${t}" (${cols}) VALUES (${placeholders})
        ON CONFLICT ("${target}") DO UPDATE SET ${setClause}`;
      const result = await getSql().unsafe(q, [...values, ...setValues]);
      return { changes: result.count, lastInsertRowid: result[0]?.id ?? null };
    }

    const q = `INSERT INTO "${t}" (${cols}) VALUES (${placeholders})`;
    const result = await getSql().unsafe(q, values);
    return { changes: result.count, lastInsertRowid: result[0]?.id ?? null };
  }
}

// ── Builder: UPDATE ────────────────────────────────────────────────────

class PgUpdateBuilder {
  private _table: any;
  private _setData: any = {};
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(table: any) { this._table = table; }

  set(data: any) { this._setData = data; return this; }

  where(condition: any) {
    const resolved = extractCondition(condition);
    if (resolved) {
      let offset = this._params.length;
      const sql = resolved.sql.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);
      this._conditions.push(sql);
      this._params.push(...resolved.params);
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  async run() {
    const t = tableName(this._table);
    const keys = Object.keys(this._setData);
    const setParts: string[] = [];
    const setValues: any[] = [];

    for (const key of keys) {
      const val = this._setData[key];
      if (val && val._sql) {
        setParts.push(`"${camelToSnake(key)}" = ${val._sql}`);
        this._params.push(...(val._params || []));
      } else {
        setParts.push(`"${camelToSnake(key)}" = $${setValues.length + 1}`);
        setValues.push(val);
      }
    }

    let q = `UPDATE "${t}" SET ${setParts.join(", ")}`;
    if (this._conditions.length > 0) {
      const offset = setValues.length;
      const resolvedConditions = this._conditions.map((c) =>
        c.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`)
      );
      q += ` WHERE ${resolvedConditions.join(" AND ")}`;
    }

    const allParams = [...setValues, ...this._params];
    const result = await getSql().unsafe(q, allParams);
    return { changes: result.count };
  }
}

// ── Builder: DELETE ────────────────────────────────────────────────────

class PgDeleteBuilder {
  private _table: any;
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(table: any) { this._table = table; }

  where(condition: any) {
    const resolved = extractCondition(condition);
    if (resolved) {
      let offset = this._params.length;
      const sql = resolved.sql.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);
      this._conditions.push(sql);
      this._params.push(...resolved.params);
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  async run() {
    const t = tableName(this._table);
    let q = `DELETE FROM "${t}"`;
    if (this._conditions.length > 0) q += ` WHERE ${this._conditions.join(" AND ")}`;
    const result = await getSql().unsafe(q, this._params);
    return { changes: result.count };
  }
}

// ── SQL tagged template (compatible with drizzle-orm style) ────────────

export function sql(strings: TemplateStringsArray, ...values: any[]) {
  let result = "";
  const params: any[] = [];
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val && val._sql) {
        result += val._sql;
        params.push(...val._params);
      } else {
        result += `?`;
        params.push(val);
      }
    }
  }
  return { _sql: result, _params: params };
}

// ── PgDb main class ────────────────────────────────────────────────────

class PgDb {
  async run(sqlOrStr: any, params?: any[]) {
    const { text, args } = resolveSql(sqlOrStr, params);
    const result = await getSql().unsafe(text, args);
    return { changes: result.count };
  }

  async all(sqlOrStr: any, params?: any[]) {
    const { text, args } = resolveSql(sqlOrStr, params);
    return getSql().unsafe(text, args);
  }

  async get(sqlOrStr: any, params?: any[]) {
    const { text, args } = resolveSql(sqlOrStr, params);
    const rows = await getSql().unsafe(text, args);
    return rows[0] ?? undefined;
  }

  async exec(sqlStr: string) {
    await getSql().unsafe(sqlStr);
  }

  select(fields?: any) { return new PgSelectBuilder(fields); }
  insert(table: any)    { return new PgInsertBuilder(table); }
  update(table: any)    { return new PgUpdateBuilder(table); }
  delete(table: any)    { return new PgDeleteBuilder(table); }
}

export const db: PgDb = new PgDb();

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
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id            SERIAL PRIMARY KEY,
      entity_type   TEXT NOT NULL,
      entity_id     TEXT NOT NULL,
      action        TEXT NOT NULL,
      changes       JSONB,
      performed_by  TEXT NOT NULL DEFAULT 'system',
      ip_address    TEXT,
      created_at    TEXT DEFAULT (NOW()::text)
    )
  `);
  try {
    await s.unsafe(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`);
    await s.unsafe(`CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at)`);
  } catch {}
  await s.unsafe(`
    CREATE TABLE IF NOT EXISTS cash_movements (
      id            SERIAL PRIMARY KEY,
      type          TEXT NOT NULL,
      amount        DOUBLE PRECISION NOT NULL,
      method        TEXT,
      reference     TEXT,
      description   TEXT,
      sale_id       INTEGER,
      created_at    TEXT DEFAULT (NOW()::text),
      created_by    TEXT NOT NULL DEFAULT 'system'
    )
  `);
  try {
    await s.unsafe(`CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_movements(created_at)`);
    await s.unsafe(`CREATE INDEX IF NOT EXISTS idx_cash_type ON cash_movements(type)`);
  } catch {}
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

export async function logAudit(params: {
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  performedBy?: string;
}) {
  try {
    const s = getSql();
    await s`INSERT INTO audit_log (entity_type, entity_id, action, changes, performed_by, created_at)
      VALUES (${params.entityType}, ${params.entityId}, ${params.action}, ${params.changes ? JSON.stringify(params.changes) : null}, ${params.performedBy || "system"}, NOW()::text)`;
  } catch (err) {
    console.error("Error writing audit log:", err);
  }
}
