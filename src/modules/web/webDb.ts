import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://openpos:openpos123@localhost:5432/openpos";

let pgClient: ReturnType<typeof postgres>;
let _initialized = false;

export function getSql() {
  if (!pgClient) {
    pgClient = postgres(DATABASE_URL, { max: 10 });
  }
  return pgClient;
}

// ── Convert ? placeholders to $1, $2... ────────────────────────────────────
function toPg(sqlStr: string, params: any[] = []): { text: string; args: any[] } {
  let i = 0;
  const text = sqlStr.replace(/\?/g, () => `$${++i}`);
  return { text, args: params };
}

// ── Drizzle-compatible wrapper ──────────────────────────────────────────────

class PgQuery {
  private _sql: string;
  private _params: any[];
  private _db: PgDb;

  constructor(db: PgDb, sql: string, params: any[] = []) {
    this._db = db;
    this._sql = sql;
    this._params = params;
  }

  then(resolve: any, reject?: any) {
    return this.all().then(resolve, reject);
  }

  async all() {
    const pg = toPg(this._sql, this._params);
    const result = await getSql().unsafe(pg.text, pg.args);
    return result;
  }

  async get() {
    const rows = await this.all();
    return rows[0] ?? undefined;
  }

  async run() {
    const pg = toPg(this._sql, this._params);
    const result = await getSql().unsafe(pg.text, pg.args);
    return { changes: result.count, lastInsertRowid: result[0]?.id ?? null };
  }
}

class PgSelectBuilder {
  private _table: any;
  private _fields: any;
  private _conditions: string[] = [];
  private _params: any[] = [];
  private _orderBy: string = "";
  private _limitVal: number = 0;
  private _offsetVal: number = 0;
  private _groupBy: string = "";
  private _db: PgDb;

  constructor(db: PgDb, fields?: any) {
    this._db = db;
    this._fields = fields;
  }

  from(table: any) {
    this._table = table;
    return this;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      // Convert ? to $N for this fragment
      let offset = this._params.length;
      const sql = condition._sql.replace(/\?/g, () => `$${++offset}`);
      this._conditions.push(sql);
      this._params.push(...(condition._params || []));
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  orderBy(...args: any[]) {
    for (const arg of args) {
      if (arg && arg._sql) {
        this._orderBy = arg._sql;
      } else if (typeof arg === "string") {
        this._orderBy = arg;
      }
    }
    return this;
  }

  groupBy(...args: any[]) {
    for (const arg of args) {
      if (arg && arg._sql) {
        this._groupBy = arg._sql;
      } else if (typeof arg === "string") {
        this._groupBy = arg;
      }
    }
    return this;
  }

  limit(n: number) {
    this._limitVal = n;
    return this;
  }

  offset(n: number) {
    this._offsetVal = n;
    return this;
  }

  private _build(): { text: string; args: any[] } {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    let q = `SELECT * FROM "${tableName}"`;
    if (this._conditions.length > 0) {
      q += ` WHERE ${this._conditions.join(" AND ")}`;
    }
    if (this._groupBy) {
      q += ` GROUP BY ${this._groupBy}`;
    }
    if (this._orderBy) {
      q += ` ORDER BY ${this._orderBy}`;
    }
    if (this._limitVal > 0) {
      q += ` LIMIT ${this._limitVal}`;
    }
    if (this._offsetVal > 0) {
      q += ` OFFSET ${this._offsetVal}`;
    }
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

  then(resolve: any, reject?: any) {
    return this.all().then(resolve, reject);
  }
}

class PgInsertBuilder {
  private _table: any;
  private _values: any = {};
  private _onConflict: any;

  constructor(_db: PgDb, table: any) {
    this._table = table;
  }

  values(data: any) {
    this._values = data;
    return this;
  }

  onConflictDoUpdate(config: any) {
    this._onConflict = config;
    return this;
  }

  async run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
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

      const q = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})
        ON CONFLICT ("${target}") DO UPDATE SET ${setClause}`;
      const result = await getSql().unsafe(q, [...values, ...setValues]);
      return { changes: result.count, lastInsertRowid: result[0]?.id ?? null };
    }

    const q = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`;
    const result = await getSql().unsafe(q, values);
    return { changes: result.count, lastInsertRowid: result[0]?.id ?? null };
  }
}

class PgUpdateBuilder {
  private _table: any;
  private _set: any = {};
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(_db: PgDb, table: any) {
    this._table = table;
  }

  set(data: any) {
    this._set = data;
    return this;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      let offset = this._params.length;
      const sql = condition._sql.replace(/\?/g, () => `$${++offset}`);
      this._conditions.push(sql);
      this._params.push(...(condition._params || []));
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  async run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    const keys = Object.keys(this._set);
    const setParts: string[] = [];
    const setValues: any[] = [];

    for (const key of keys) {
      const val = this._set[key];
      if (val && val._sql) {
        setParts.push(`"${camelToSnake(key)}" = ${val._sql}`);
        this._params.push(...(val._params || []));
      } else {
        setParts.push(`"${camelToSnake(key)}" = $${setValues.length + 1}`);
        setValues.push(val);
      }
    }

    let q = `UPDATE "${tableName}" SET ${setParts.join(", ")}`;
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

class PgDeleteBuilder {
  private _table: any;
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(_db: PgDb, table: any) {
    this._table = table;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      let offset = this._params.length;
      const sql = condition._sql.replace(/\?/g, () => `$${++offset}`);
      this._conditions.push(sql);
      this._params.push(...(condition._params || []));
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  async run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    let q = `DELETE FROM "${tableName}"`;
    if (this._conditions.length > 0) {
      q += ` WHERE ${this._conditions.join(" AND ")}`;
    }
    const result = await getSql().unsafe(q, this._params);
    return { changes: result.count };
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

class PgDb {
  async prepare(sql: string) {
    return new PgQuery(this, sql);
  }

  async exec(sql: string) {
    await getSql().unsafe(sql);
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    return getSql().begin(async (tx) => {
      // Override getSql for the duration of the transaction
      return fn();
    });
  }

  select(fields?: any) {
    return new PgSelectBuilder(this, fields);
  }

  insert(table: any) {
    return new PgInsertBuilder(this, table);
  }

  update(table: any) {
    return new PgUpdateBuilder(this, table);
  }

  delete(table: any) {
    return new PgDeleteBuilder(this, table);
  }

  async run(sql: string, params?: any[]) {
    const pg = toPg(sql, params || []);
    const result = await getSql().unsafe(pg.text, pg.args);
    return { changes: result.count };
  }

  async all(sql: string, params?: any[]) {
    const pg = toPg(sql, params || []);
    return getSql().unsafe(pg.text, pg.args);
  }

  async get(sql: string, params?: any[]) {
    const pg = toPg(sql, params || []);
    const rows = await getSql().unsafe(pg.text, pg.args);
    return rows[0] ?? undefined;
  }
}

const dbInstance = new PgDb();

// ── Schema objects ────────────────────────────────────────────────────────

export const schema = {
  config: { _: { name: "config" }, key: "key", value: "value" },
  products: {
    _: { name: "products" },
    id: "id",
    barcode: "barcode",
    sku: "sku",
    name: "name",
    price: "price",
    cost: "cost",
    category: "category",
    stock: "stock",
    minStock: "min_stock",
    unitType: "unit_type",
    unitQty: "unit_qty",
    active: "active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  sales: {
    _: { name: "sales" },
    id: "id",
    ticket: "ticket",
    subtotal: "subtotal",
    tax: "tax",
    discount: "discount",
    total: "total",
    received: "received",
    change: "change",
    method: "method",
    status: "status",
    items: "items",
    itemCount: "item_count",
    createdAt: "created_at",
    createdBy: "created_by",
    customerRfc: "customer_rfc",
    customerRazonSocial: "customer_razon_social",
    customerEmail: "customer_email",
    cfdiStatus: "cfdi_status",
    cfdiUuid: "cfdi_uuid",
  },
  users: {
    _: { name: "users" },
    id: "id",
    username: "username",
    name: "name",
    pin: "pin",
    role: "role",
    active: "active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  clients: {
    _: { name: "clients" },
    id: "id",
    code: "code",
    rfc: "rfc",
    razonSocial: "razon_social",
    email: "email",
    telefono: "telefono",
    direccion: "direccion",
    regimenFiscal: "regimen_fiscal",
    puntos: "puntos",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
};

// ── SQL tagged template helper ────────────────────────────────────────────

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

// ── Config helpers ────────────────────────────────────────────────────────

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
} as const;

export async function getConfig(key: string): Promise<string | null> {
  try {
    const row = await dbInstance.get("SELECT value FROM config WHERE key = $1", [key]) as any;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setConfig(key: string, value: string): Promise<boolean> {
  try {
    await dbInstance.run(
      `INSERT INTO config (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value]
    );
    return true;
  } catch {
    return false;
  }
}

// ── Client helpers ────────────────────────────────────────────────────────

async function getNextClientCode(): Promise<string> {
  const row = await dbInstance.get("SELECT code FROM clients ORDER BY id DESC LIMIT 1") as any;
  if (!row) return "CL-00001";
  const lastNum = parseInt(row.code.replace("CL-", ""), 10);
  return `CL-${String(lastNum + 1).padStart(5, "0")}`;
}

export async function getClientByRfc(rfc: string): Promise<any | null> {
  try {
    return await dbInstance.get("SELECT * FROM clients WHERE rfc = $1", [rfc]) ?? null;
  } catch {
    return null;
  }
}

export async function getOrCreateClient(data: {
  rfc: string;
  razonSocial: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  regimenFiscal?: string;
}): Promise<any> {
  const existing = await getClientByRfc(data.rfc);
  if (existing) return existing;

  const code = await getNextClientCode();
  const now = new Date().toISOString();

  await dbInstance.run(
    `INSERT INTO clients (code, rfc, razon_social, email, telefono, direccion, regimen_fiscal, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [code, data.rfc, data.razonSocial, data.email || null, data.telefono || null, data.direccion || null, data.regimenFiscal || null, now, now]
  );

  return getClientByRfc(data.rfc)!;
}

export async function listClients(search?: string): Promise<any[]> {
  try {
    if (search) {
      return await dbInstance.all(
        `SELECT * FROM clients WHERE rfc LIKE $1 OR razon_social LIKE $1 OR email LIKE $1 OR code LIKE $1 ORDER BY razon_social ASC`,
        [`%${search}%`]
      );
    }
    return await dbInstance.all("SELECT * FROM clients ORDER BY razon_social ASC");
  } catch {
    return [];
  }
}

// ── Product search ────────────────────────────────────────────────────────

export async function searchProducts(query: string, offset = 0, limit = 50): Promise<{ items: any[]; total: number }> {
  const q = `%${query}%`;

  const countRow = query
    ? await dbInstance.get(
        `SELECT COUNT(*)::int as count FROM products WHERE active = 1 AND (name LIKE $1 OR sku LIKE $1 OR barcode LIKE $1)`,
        [q]
      ) as any
    : await dbInstance.get(`SELECT COUNT(*)::int as count FROM products WHERE active = 1`) as any;

  const items = query
    ? await dbInstance.all(
        `SELECT * FROM products WHERE active = 1 AND (name LIKE $1 OR sku LIKE $1 OR barcode LIKE $1) ORDER BY name ASC LIMIT $2 OFFSET $3`,
        [q, limit, offset]
      )
    : await dbInstance.all(
        `SELECT * FROM products WHERE active = 1 ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

  return { items, total: countRow?.count || 0 };
}

// ── Init tables ───────────────────────────────────────────────────────────

async function initTables() {
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
  // Unique index on ticket - skip if duplicates exist
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
  await initDefaultConfig();
}

async function initDefaultConfig() {
  const defaults: Record<string, string> = {
    [CONFIG_KEYS.LAST_TICKET]: "1",
    [CONFIG_KEYS.STORE_NAME]: "MI TIENDA",
    [CONFIG_KEYS.STORE_RFC]: "XAXX010101000",
    [CONFIG_KEYS.STORE_ADDRESS]: "Calle Principal 123",
    [CONFIG_KEYS.STORE_LEGAL_NAME]: "Mi Tienda SA de CV",
    [CONFIG_KEYS.STORE_EMAIL]: "",
    [CONFIG_KEYS.STORE_PHONE]: "",
    [CONFIG_KEYS.STORE_REGIMEN]: "601",
    [CONFIG_KEYS.TAX_RATE]: "16",
    [CONFIG_KEYS.PRINTER_ENABLED]: "true",
    [CONFIG_KEYS.PRINTER_REQUIRED]: "true",
    [CONFIG_KEYS.PRINTER_TYPE]: "Windows Printer",
    [CONFIG_KEYS.PRINTER_INTERFACE]: "printer:POS-80",
    [CONFIG_KEYS.PRINTER_WIDTH]: "48",
    [CONFIG_KEYS.PRINTER_CHARACTER_SET]: "PC437",
    [CONFIG_KEYS.RECEIPT_PROMPT_ON_SALE]: "true",
    [CONFIG_KEYS.RECEIPT_DEFAULT_DELIVERY]: "printed",
    [CONFIG_KEYS.BILLING_PROVIDER]: "facturapi",
    [CONFIG_KEYS.BILLING_SANDBOX]: "true",
  };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const existing = await getConfig(key);
    if (existing === null) {
      await setConfig(key, defaultValue);
    }
  }
}

export async function initDb() {
  if (!_initialized) {
    await initTables();
    _initialized = true;
  }
}

export function getRawDb() {
  return dbInstance;
}
