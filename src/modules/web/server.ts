import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
import { salesRoutes } from "./routes/sales";
import { clientRoutes } from "./routes/clients";
import { configRoutes } from "./routes/config";
import { reportRoutes } from "./routes/reports";
import { importRoutes } from "./routes/import";
import { inventoryRoutes } from "./routes/inventory";
import { userRoutes } from "./routes/users";
import { receiptsRoutes } from "./routes/receipts";
import { telegramRoutes } from "./routes/telegram";
import { kpisRoutes } from "./routes/kpis";
import { auditRoutes } from "./routes/audit";
import { cashRoutes } from "./routes/cash";
import { initDb } from "./webDb";
import { requireAuth, requireRole } from "./auth";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3001,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] || "";
      return allowedOrigins.includes(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// ── API routes (must be BEFORE static files) ────────────────────────────────
const api = new Hono();
api.use("*", requireAuth);

api.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vanity POS API Reference</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f14; color: #e4e4e7; line-height: 1.6; }
    @media (prefers-color-scheme: light) {
      body { background: #fafafa; color: #18181b; }
      .section { background: #fff; border-color: #e4e4e7; }
      .section-header { background: #f4f4f5; border-color: #e4e4e7; }
      .endpoint:hover { background: #f4f4f5; }
      .endpoint-path { color: #09090b; }
      .endpoint-desc { color: #71717a; }
      .base-url { background: #f4f4f5; border-color: #e4e4e7; }
      .base-url span { color: #71717a; }
      .base-url code { color: #7c3aed; }
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    header { text-align: center; margin-bottom: 48px; }
    h1 { font-size: 2.5rem; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
    .version { color: #71717a; font-size: 0.9rem; }
    .section { margin-bottom: 32px; background: #18181b; border-radius: 12px; border: 1px solid #27272a; overflow: hidden; }
    .section-header { padding: 16px 20px; background: #1f1f23; border-bottom: 1px solid #27272a; display: flex; align-items: center; gap: 10px; }
    .section-header h2 { font-size: 1.1rem; font-weight: 600; }
    .section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
    .icon-auth { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .icon-products { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .icon-sales { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .icon-clients { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
    .icon-config { background: rgba(234, 179, 8, 0.15); color: #eab308; }
    .icon-reports { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
    .icon-import { background: rgba(249, 115, 22, 0.15); color: #f97316; }
    .endpoint { padding: 16px 20px; border-bottom: 1px solid #27272a; display: flex; align-items: flex-start; gap: 12px; }
    .endpoint:last-child { border-bottom: none; }
    .endpoint:hover { background: #1f1f23; }
    .method { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; min-width: 60px; text-align: center; text-transform: uppercase; }
    .method-get { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .method-post { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .method-put { background: rgba(234, 179, 8, 0.2); color: #eab308; }
    .method-delete { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .endpoint-info { flex: 1; }
    .endpoint-path { font-family: 'SF Mono', Monaco, monospace; font-size: 0.9rem; color: #fafafa; }
    .endpoint-desc { font-size: 0.85rem; color: #a1a1aa; margin-top: 4px; }
    .base-url { background: #1f1f23; border: 1px solid #27272a; border-radius: 8px; padding: 12px 16px; margin-bottom: 32px; text-align: center; }
    .base-url span { color: #71717a; font-size: 0.85rem; }
    .base-url code { color: #a78bfa; font-family: monospace; }
    footer { text-align: center; color: #52525b; font-size: 0.8rem; margin-top: 48px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Vanity POS API</h1>
      <p class="version">v1.0.0</p>
    </header>

    <div class="base-url">
      <span>Base URL: </span><code>http://localhost:3001/api</code>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-auth">🔑</div>
        <h2>Auth</h2>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/auth/login</div>
          <div class="endpoint-desc">Login with username and PIN. Returns JWT token.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/auth/me</div>
          <div class="endpoint-desc">Get current authenticated user info.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-products">📦</div>
        <h2>Products</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/products</div>
          <div class="endpoint-desc">List products. Query params: q (search), page, limit.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/products/:sku</div>
          <div class="endpoint-desc">Get a single product by SKU.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/products</div>
          <div class="endpoint-desc">Create a new product. Body: { sku, name, price, ... }</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-put">PUT</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/products/:sku</div>
          <div class="endpoint-desc">Update an existing product by SKU.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-delete">DELETE</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/products/:sku</div>
          <div class="endpoint-desc">Deactivate a product (soft delete).</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-sales">💰</div>
        <h2>Sales</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/sales</div>
          <div class="endpoint-desc">List all sales.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/sales</div>
          <div class="endpoint-desc">Create a new sale transaction.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-clients">👤</div>
        <h2>Clients</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/clients</div>
          <div class="endpoint-desc">List all clients.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/clients</div>
          <div class="endpoint-desc">Create a new client.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-config">⚙️</div>
        <h2>Config</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/config</div>
          <div class="endpoint-desc">Get current configuration.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-put">PUT</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/config</div>
          <div class="endpoint-desc">Update configuration.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-reports">📊</div>
        <h2>Reports</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/reports</div>
          <div class="endpoint-desc">Get sales reports and analytics.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-reports">📈</div>
        <h2>KPIs</h2>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/kpis</div>
          <div class="endpoint-desc">Get key performance indicators. Only accessible to admins and managers.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/kpis/products</div>
          <div class="endpoint-desc">Get product KPIs. Only accessible to admins and managers.</div>
        </div>
      </div>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/kpis/users</div>
          <div class="endpoint-desc">Get user KPIs. Only accessible to admins and managers.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-icon icon-import">📥</div>
        <h2>Import</h2>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <div class="endpoint-info">
          <div class="endpoint-path">/api/import</div>
          <div class="endpoint-desc">Import data from CSV file.</div>
        </div>
      </div>
    </div>

    <footer>
      <p>Vanity POS &copy; 2026</p>
    </footer>
  </div>
</body>
</html>`;

  return c.html(html);
});

api.route("/auth", authRoutes);
api.route("/telegram", telegramRoutes);
api.use("/users", requireRole("admin"));
api.use("/users/*", requireRole("admin"));
api.use("/import", requireRole("admin"));
api.use("/import/*", requireRole("admin"));
api.route("/products", productRoutes);
api.route("/sales", salesRoutes);
api.route("/clients", clientRoutes);
api.route("/users", userRoutes);
api.route("/config", configRoutes);
api.route("/reports", reportRoutes);
api.route("/inventory", inventoryRoutes);
api.route("/import", importRoutes);
api.route("/receipts", receiptsRoutes);
api.route("/kpis", kpisRoutes);
api.route("/audit", auditRoutes);
api.route("/cash", cashRoutes);
app.route("/api", api);

// ── Static files (SPA fallback) ─────────────────────────────────────────────
const DIST_DIR = resolve(__dirname, "../../../dist/web");

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  webp: "image/webp",
};

function setStaticCacheHeaders(
  c: Parameters<Parameters<typeof app.get>[1]>[0],
  ext: string,
  urlPath: string
) {
  if (ext === "html") {
    c.header("Cache-Control", "no-store");
    return;
  }

  if (urlPath.startsWith("/assets/")) {
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  c.header("Cache-Control", "no-cache");
}

app.get("/*", (c) => {
  const urlPath = new URL(c.req.url).pathname;
  const safePath = urlPath.split("?")[0];

  // Resolve file path
  const filePath = resolve(DIST_DIR, safePath.startsWith("/") ? safePath.slice(1) : safePath);

  // Security: prevent path traversal
  if (!filePath.startsWith(DIST_DIR)) {
    return c.text("Forbidden", 403);
  }

  // Check if it's a real file
  try {
    const stat = statSync(filePath);
    if (stat.isFile()) {
      const content = readFileSync(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      c.header("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
      c.header("Content-Length", String(content.length));
      setStaticCacheHeaders(c, ext, safePath);
      return c.body(content);
    }
  } catch {}

  if (safePath.startsWith("/assets/")) {
    c.header("Cache-Control", "no-store");
    return c.text("Asset not found", 404);
  }

  // SPA fallback: serve index.html
  try {
    const indexHtml = readFileSync(resolve(DIST_DIR, "index.html"));
    c.header("Content-Type", "text/html; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(indexHtml);
  } catch {
    return c.text("Not found", 404);
  }
});

const port = Number(process.env.PORT) || 3001;

export async function createWebServer() {
  await initDb();

  Bun.serve({
    fetch: app.fetch,
    port,
  });
  console.log(`\n  ✨ Vanity POS — Web Mode`);
  console.log(`  ➜ Local: http://localhost:${port}`);
  console.log(`  ➜ API:   http://localhost:${port}/api`);
  console.log(`  ➜ Dist:  ${DIST_DIR}\n`);
}

export { app };

// Auto-start when run directly (not when imported)
const isMainModule = import.meta.main;
if (isMainModule) {
  createWebServer().catch((err) => {
    console.error("Failed to start web server:", err);
    process.exit(1);
  });
}
