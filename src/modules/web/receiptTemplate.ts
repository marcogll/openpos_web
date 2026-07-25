export type ReceiptItem = {
  sku?: string;
  name: string;
  price: number;
  qty: number;
  unitType?: string;
  unit_type?: string;
};

export type ReceiptSale = {
  ticket: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  received: number;
  change: number;
  method: string;
  createdAt?: string;
  created_at?: string;
  createdBy?: string;
  created_by?: string;
  customerEmail?: string | null;
  customer_email?: string | null;
};

export type ReceiptTheme = {
  ink?: string;
  paper?: string;
  background?: string;
  line?: string;
  accent?: string;
  accentDeep?: string;
  muted?: string;
};

export type ReceiptStore = {
  name: string;
  legalName?: string;
  rfc?: string;
  address?: string;
  logoUrl?: string;
  theme?: ReceiptTheme;
};

export const DEFAULT_RECEIPT_THEME = {
  ink: "#1c1a19",
  paper: "#faf7f3",
  background: "#e9e3da",
  line: "#e4dcd3",
  accent: "#a9834f",
  accentDeep: "#8a6a3c",
  muted: "#8c8378",
};

export function buildReceiptText(sale: ReceiptSale, store: ReceiptStore): string {
  const createdAt = sale.createdAt || sale.created_at || new Date().toISOString();
  const employee = sale.createdBy || sale.created_by || "Cajero";
  const date = new Date(createdAt);
  const lines = [
    `${store.name || "Vanity"} · Recibo`,
    `Ticket: ${sale.ticket}`,
    `Fecha: ${date.toLocaleString("es-MX")}`,
    `Cajero: ${employee}`,
    "",
    "Productos",
    ...sale.items.map((item) => {
      const qty = Number(item.qty);
      const lineTotal = qty * Number(item.price);
      const unit = item.unitType || item.unit_type || "pza";
      return `${qty} ${unit} · ${item.name} · ${formatMoney(lineTotal)}`;
    }),
    "",
    `Subtotal: ${formatMoney(sale.subtotal)}`,
    `IVA (16%): ${formatMoney(sale.tax)}`,
    `Total: ${formatMoney(sale.total)}`,
    `Metodo: ${sale.method}`,
    `Recibido: ${formatMoney(sale.received)}`,
    `Cambio: ${formatMoney(sale.change)}`,
  ];

  return lines.join("\n");
}

export function buildWhatsappUrl(sale: ReceiptSale, store: ReceiptStore): string {
  return `https://wa.me/?text=${encodeURIComponent(buildReceiptText(sale, store))}`;
}

export function buildMailtoUrl(sale: ReceiptSale, store: ReceiptStore): string {
  const email = sale.customerEmail || sale.customer_email || "";
  const subject = `Recibo ${sale.ticket} · ${store.name || "Vanity"}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    buildReceiptText(sale, store)
  )}`;
}

export function renderVanityReceiptHtml(sale: ReceiptSale, store: ReceiptStore): string {
  const createdAt = sale.createdAt || sale.created_at || new Date().toISOString();
  const date = new Date(createdAt);
  const [addressLine1, addressLine2] = splitAddress(store.address || "");
  const theme = normalizeReceiptTheme(store.theme);
  const logoUrl =
    store.logoUrl ||
    "https://raw.githubusercontent.com/marcogll/mg_data_storage/refs/heads/main/vanity/logo_vanity_simplificado.svg";
  const employee = sale.createdBy || sale.created_by || "Cajero";
  const rows = sale.items
    .map((item) => {
      const qty = Number(item.qty);
      const lineTotal = qty * Number(item.price);
      return `
        <tr>
          <td class="qty">${escapeHtml(formatQty(qty))}</td>
          <td class="desc">${escapeHtml(item.name)}</td>
          <td class="price">${escapeHtml(formatMoney(lineTotal))}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo ${escapeHtml(sale.ticket)} · Vanity</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600&display=swap');
  :root{--ink:${theme.ink};--paper:${theme.paper};--line:${theme.line};--gold:${theme.accent};--gold-deep:${theme.accentDeep};--muted:${theme.muted};--receipt-bg:${theme.background};}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--receipt-bg);font-family:'Jost',sans-serif;color:var(--ink);display:flex;justify-content:center;padding:40px 16px;}
  .receipt{width:380px;background:var(--paper);position:relative;padding:36px 30px 28px;box-shadow:0 30px 60px -20px rgba(28,26,25,0.35);}
  .receipt::before,.receipt::after{content:"";position:absolute;left:0;right:0;height:10px;background:radial-gradient(circle at 8px 5px,var(--receipt-bg) 5px,transparent 5.5px) repeat-x;background-size:16px 10px;}
  .receipt::before{top:-5px;}.receipt::after{bottom:-5px;}
  .brand{text-align:center;padding-bottom:20px;border-bottom:1px solid var(--line);margin-bottom:22px;}
  .brand img{height:52px;width:auto;margin:0 auto 10px;display:block;}
  .brand .tag{font-family:'Jost',sans-serif;font-size:9.5px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold-deep);}
  .meta{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px;gap:16px;}
  .meta span.label{color:var(--ink);font-weight:500;text-align:right;}
  .ticket-id{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;letter-spacing:.02em;margin:14px 0 18px;display:flex;align-items:baseline;justify-content:space-between;}
  .ticket-id .num{color:var(--gold-deep);}
  .section-label{font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
  table.items{width:100%;border-collapse:collapse;margin-bottom:6px;}
  table.items th{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);text-align:left;font-weight:500;padding-bottom:8px;border-bottom:1px solid var(--line);}
  table.items th.num,table.items td.num{text-align:right;}
  table.items td{font-size:12.5px;padding:9px 0;border-bottom:1px dashed var(--line);vertical-align:top;}
  table.items td.qty{color:var(--muted);width:22px;}
  table.items td.desc{padding-right:8px;}
  table.items td.price{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}
  .totals{margin-top:16px;padding-top:2px;}
  .totals .row{display:flex;justify-content:space-between;font-size:12px;padding:6px 0;color:var(--muted);}
  .totals .row.grand{margin-top:6px;padding-top:14px;border-top:1px solid var(--ink);font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:var(--ink);}
  .totals .row.grand span:last-child{color:var(--gold-deep);}
  .pay{margin-top:18px;display:flex;justify-content:space-between;font-size:11px;color:var(--muted);gap:16px;}
  .pay span.label{color:var(--ink);font-weight:500;text-transform:capitalize;text-align:right;}
  .divider{margin:26px 0 22px;border:none;border-top:1px solid var(--line);}
  .qr-block{text-align:center;}
  .qr-block img{width:132px;height:132px;display:block;margin:0 auto 10px;border:1px solid var(--line);padding:8px;background:#fff;}
  .qr-block .cta{font-size:10.5px;letter-spacing:.08em;color:var(--gold-deep);font-weight:600;}
  .qr-block .url{font-size:10px;color:var(--muted);margin-top:2px;}
  .footer{margin-top:26px;text-align:center;}
  .footer .loc-name{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;margin-bottom:3px;}
  .footer .addr{font-size:10px;line-height:1.5;color:var(--muted);max-width:260px;margin:0 auto;}
  .footer .thanks{margin-top:16px;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--gold-deep);}
  @media print{body{background:#fff;padding:0;}.receipt{box-shadow:none;}}
</style>
</head>
<body>
  <div class="receipt">
    <div class="brand">
      <img src="${escapeHtml(logoUrl)}" alt="Vanity">
      <div class="tag">Nails & SPA</div>
    </div>
    <div class="meta"><span>Fecha</span><span class="label">${escapeHtml(date.toLocaleDateString("es-MX"))} · ${escapeHtml(date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }))}</span></div>
    <div class="meta"><span>Cajero</span><span class="label">${escapeHtml(employee)}</span></div>
    <div class="ticket-id"><span>Ticket</span><span class="num">${escapeHtml(sale.ticket)}</span></div>
    <div class="section-label">Productos</div>
    <table class="items">
      <thead><tr><th class="qty">#</th><th>Descripción</th><th class="num">Precio</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(sale.subtotal))}</span></div>
      <div class="row"><span>IVA (16%)</span><span>${escapeHtml(formatMoney(sale.tax))}</span></div>
      <div class="row grand"><span>Total</span><span>${escapeHtml(formatMoney(sale.total))}</span></div>
    </div>
    <div class="pay"><span>Método de pago</span><span class="label">${escapeHtml(sale.method)}</span></div>
    <div class="pay"><span>Recibido</span><span class="label">${escapeHtml(formatMoney(sale.received))}</span></div>
    <div class="pay"><span>Cambio</span><span class="label">${escapeHtml(formatMoney(sale.change))}</span></div>
    <hr class="divider">
    <div class="qr-block">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=https://shop.vanityexperience.mx&color=1c1a19&bgcolor=faf7f3" alt="QR Vanity Shop">
      <div class="cta">Descubre más en Vanity Shop</div>
      <div class="url">shop.vanityexperience.mx</div>
    </div>
    <div class="footer">
      <div class="loc-name">Vanity · ${escapeHtml(store.name || "Sucursal")}</div>
      <div class="addr">${escapeHtml(addressLine1)}${addressLine2 ? `<br>${escapeHtml(addressLine2)}` : ""}</div>
      <div class="thanks">Gracias por tu visita</div>
    </div>
  </div>
</body>
</html>`;
}

function normalizeReceiptTheme(theme: ReceiptTheme = {}) {
  return {
    ink: safeHex(theme.ink, DEFAULT_RECEIPT_THEME.ink),
    paper: safeHex(theme.paper, DEFAULT_RECEIPT_THEME.paper),
    background: safeHex(theme.background, DEFAULT_RECEIPT_THEME.background),
    line: safeHex(theme.line, DEFAULT_RECEIPT_THEME.line),
    accent: safeHex(theme.accent, DEFAULT_RECEIPT_THEME.accent),
    accentDeep: safeHex(theme.accentDeep, DEFAULT_RECEIPT_THEME.accentDeep),
    muted: safeHex(theme.muted, DEFAULT_RECEIPT_THEME.muted),
  };
}

function safeHex(value: string | undefined, fallback: string) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function splitAddress(address: string) {
  if (!address.trim()) return ["", ""];
  const parts = address.split(/\n|,/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return [address.trim(), ""];
  return [parts[0], parts.slice(1).join(", ")];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value) || 0);
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(2)).replace(/\.?0+$/, "");
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
