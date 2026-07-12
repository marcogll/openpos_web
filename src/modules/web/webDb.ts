import Database from "better-sqlite3";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "pos.db");

let sqlite: Database.Database;
let _db: any;

function getDb() {
  if (!sqlite) {
    sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    initTables();
  }
  return sqlite;
}

function getDrizzleDb() {
  if (!_db) {
    const dbInstance = getDb();
    // Minimal Drizzle-compatible wrapper
    _db = createDrizzleProxy(dbInstance);
  }
  return _db;
}

function createDrizzleProxy(db: Database.Database) {
  return {
    select(fields?: any) {
      return new SelectBuilder(db, fields);
    },
    insert(table: any) {
      return new InsertBuilder(db, table);
    },
    update(table: any) {
      return new UpdateBuilder(db, table);
    },
    delete(table: any) {
      return new DeleteBuilder(db, table);
    },
    run(sql: string, params?: any[]) {
      return db.prepare(sql).run(...(params || []));
    },
    exec(sql: string) {
      return db.exec(sql);
    },
    all(sql: string, params?: any[]) {
      return db.prepare(sql).all(...(params || []));
    },
    get(sql: string, params?: any[]) {
      return db.prepare(sql).get(...(params || []));
    },
  };
}

class SelectBuilder {
  private _table: any;
  private _fields: any;
  private _conditions: string[] = [];
  private _params: any[] = [];
  private _orderBy: string = "";
  private _limitVal: number = 0;
  private _offsetVal: number = 0;
  private _groupBy: string = "";
  private _db: Database.Database;

  constructor(db: Database.Database, fields?: any) {
    this._db = db;
    this._fields = fields;
  }

  from(table: any) {
    this._table = table;
    return this;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      this._conditions.push(condition._sql);
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

  private _build(): { sql: string; params: any[] } {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    let sql = `SELECT * FROM "${tableName}"`;
    if (this._conditions.length > 0) {
      sql += ` WHERE ${this._conditions.join(" AND ")}`;
    }
    if (this._groupBy) {
      sql += ` GROUP BY ${this._groupBy}`;
    }
    if (this._orderBy) {
      sql += ` ORDER BY ${this._orderBy}`;
    }
    if (this._limitVal > 0) {
      sql += ` LIMIT ${this._limitVal}`;
    }
    if (this._offsetVal > 0) {
      sql += ` OFFSET ${this._offsetVal}`;
    }
    return { sql, params: this._params };
  }

  all() {
    const { sql, params } = this._build();
    return this._db.prepare(sql).all(...params);
  }

  get() {
    const { sql, params } = this._build();
    return this._db.prepare(sql).get(...params);
  }

  then(resolve: any, reject?: any) {
    try {
      resolve(this.all());
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
}

class InsertBuilder {
  private _db: Database.Database;
  private _table: any;
  private _values: any = {};

  constructor(db: Database.Database, table: any) {
    this._db = db;
    this._table = table;
  }

  values(data: any) {
    this._values = data;
    return this;
  }

  onConflictDoUpdate(config: any) {
    // Store for later execution
    this._onConflict = config;
    return this;
  }

  private _onConflict: any;

  run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    const keys = Object.keys(this._values);
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.map((k) => `"${k}"`).join(", ");
    const values = keys.map((k) => this._values[k]);

    if (this._onConflict) {
      const target = this._onConflict.target;
      const setFields = this._onConflict.set;
      const setKeys = Object.keys(setFields);
      const setClause = setKeys.map((k) => `"${k}" = ?`).join(", ");
      const setValues = setKeys.map((k) => setFields[k]);

      const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})
        ON CONFLICT("${target}") DO UPDATE SET ${setClause}`;
      return this._db.prepare(sql).run(...values, ...setValues);
    }

    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`;
    return this._db.prepare(sql).run(...values);
  }
}

class UpdateBuilder {
  private _db: Database.Database;
  private _table: any;
  private _set: any = {};
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(db: Database.Database, table: any) {
    this._db = db;
    this._table = table;
  }

  set(data: any) {
    this._set = data;
    return this;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      this._conditions.push(condition._sql);
      this._params.push(...(condition._params || []));
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    const keys = Object.keys(this._set);
    const setParts: string[] = [];
    const setValues: any[] = [];

    for (const key of keys) {
      const val = this._set[key];
      if (val && val._sql) {
        setParts.push(`"${key}" = ${val._sql}`);
        this._params.push(...(val._params || []));
      } else {
        setParts.push(`"${key}" = ?`);
        setValues.push(val);
      }
    }

    let sql = `UPDATE "${tableName}" SET ${setParts.join(", ")}`;
    if (this._conditions.length > 0) {
      sql += ` WHERE ${this._conditions.join(" AND ")}`;
    }

    return this._db.prepare(sql).run(...setValues, ...this._params);
  }
}

class DeleteBuilder {
  private _db: Database.Database;
  private _table: any;
  private _conditions: string[] = [];
  private _params: any[] = [];

  constructor(db: Database.Database, table: any) {
    this._db = db;
    this._table = table;
  }

  where(condition: any) {
    if (condition && condition._sql) {
      this._conditions.push(condition._sql);
      this._params.push(...(condition._params || []));
    } else if (typeof condition === "string") {
      this._conditions.push(condition);
    }
    return this;
  }

  run() {
    const tableName = this._table?._?.name || this._table?.name || "unknown";
    let sql = `DELETE FROM "${tableName}"`;
    if (this._conditions.length > 0) {
      sql += ` WHERE ${this._conditions.join(" AND ")}`;
    }
    return this._db.prepare(sql).run(...this._params);
  }
}

// ── Schema objects (minimal, just name for table resolution) ────────────────

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

// ── SQL tagged template helper ──────────────────────────────────────────────

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
        result += "?";
        params.push(val);
      }
    }
  }
  return { _sql: result, _params: params };
}

// ── Config helpers ──────────────────────────────────────────────────────────

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

export function getConfig(key: string): string | null {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as any;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function setConfig(key: string, value: string): boolean {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, value);
    return true;
  } catch {
    return false;
  }
}

// ── Client helpers ──────────────────────────────────────────────────────────

function getNextClientCode(): string {
  const db = getDb();
  const row = db.prepare("SELECT code FROM clients ORDER BY id DESC LIMIT 1").get() as any;
  if (!row) return "CL-00001";
  const lastNum = parseInt(row.code.replace("CL-", ""), 10);
  return `CL-${String(lastNum + 1).padStart(5, "0")}`;
}

export function getClientByRfc(rfc: string): any | null {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM clients WHERE rfc = ?").get(rfc) ?? null;
  } catch {
    return null;
  }
}

export function getOrCreateClient(data: {
  rfc: string;
  razonSocial: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  regimenFiscal?: string;
}): any {
  const existing = getClientByRfc(data.rfc);
  if (existing) return existing;

  const db = getDb();
  const code = getNextClientCode();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO clients (code, rfc, razon_social, email, telefono, direccion, regimen_fiscal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(code, data.rfc, data.razonSocial, data.email || null, data.telefono || null, data.direccion || null, data.regimenFiscal || null, now, now);

  return getClientByRfc(data.rfc)!;
}

export function listClients(search?: string): any[] {
  try {
    const db = getDb();
    if (search) {
      return db.prepare(
        `SELECT * FROM clients WHERE rfc LIKE ? OR razon_social LIKE ? OR email LIKE ? OR code LIKE ? ORDER BY razon_social ASC`
      ).all(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    return db.prepare("SELECT * FROM clients ORDER BY razon_social ASC").all();
  } catch {
    return [];
  }
}

// ── Product search ──────────────────────────────────────────────────────────

export function searchProducts(query: string, offset = 0, limit = 50): { items: any[]; total: number } {
  const db = getDb();
  const q = `%${query}%`;

  const countRow = query
    ? db.prepare(
        `SELECT COUNT(*) as count FROM products WHERE active = 1 AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`
      ).get(q, q, q) as any
    : db.prepare(`SELECT COUNT(*) as count FROM products WHERE active = 1`).get() as any;

  const items = query
    ? db.prepare(
        `SELECT * FROM products WHERE active = 1 AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?`
      ).all(q, q, q, limit, offset)
    : db.prepare(
        `SELECT * FROM products WHERE active = 1 ORDER BY name ASC LIMIT ? OFFSET ?`
      ).all(limit, offset);

  return { items, total: countRow?.count || 0 };
}

// ── Init tables ─────────────────────────────────────────────────────────────

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode    TEXT UNIQUE,
      sku        TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      price      REAL NOT NULL,
      cost       REAL DEFAULT 0,
      category   TEXT NOT NULL DEFAULT 'GEN',
      stock      REAL NOT NULL DEFAULT 0,
      min_stock  REAL DEFAULT 5,
      unit_type  TEXT NOT NULL DEFAULT 'pza',
      unit_qty   REAL DEFAULT 1,
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket     TEXT NOT NULL,
      subtotal   REAL NOT NULL,
      tax        REAL NOT NULL,
      discount   REAL DEFAULT 0,
      total      REAL NOT NULL,
      received   REAL DEFAULT 0,
      change     REAL DEFAULT 0,
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
  const duplicateTickets = db.prepare(
    "SELECT ticket FROM sales GROUP BY ticket HAVING COUNT(*) > 1 LIMIT 1"
  ).all();
  if (duplicateTickets.length === 0) {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_ticket_unique ON sales(ticket)");
  } else {
    db.exec("CREATE INDEX IF NOT EXISTS idx_sales_ticket ON sales(ticket)");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      pin        TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'cashier',
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT NOT NULL UNIQUE,
      rfc           TEXT NOT NULL UNIQUE,
      razon_social  TEXT NOT NULL,
      email         TEXT,
      telefono      TEXT,
      direccion     TEXT,
      regimen_fiscal TEXT,
      puntos        REAL DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )
  `);
  initDefaultConfig();
}

function initDefaultConfig() {
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
    if (getConfig(key) === null) {
      setConfig(key, defaultValue);
    }
  }
}

export function initDb() {
  getDb();
}

export { getDb as getRawDb };
