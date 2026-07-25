import React from "react";
import {
  FileCheck,
  Download,
  Printer,
  Mail,
  MessageCircle,
  Send,
  Search,
  Upload,
  Settings,
  FileImage,
  Save,
  Loader2,
  Receipt,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { CsvSalesImport } from "../settings/CsvSalesImport";

type SaleRow = {
  ticket: string;
  method: string;
  total: number;
  itemCount?: number;
  item_count?: number;
  createdAt?: string;
  created_at?: string;
  createdBy?: string;
  created_by?: string;
  customerEmail?: string | null;
  customer_email?: string | null;
};

type ReceiptResponse = {
  html: string;
  text: string;
  filename: string;
  whatsappUrl: string;
  mailtoUrl: string;
};

type ReceiptConfig = {
  storeLogoUrl: string;
  webhookReceiptUrl: string;
  receiptDefaultDelivery: string;
  receiptPromptOnSale: boolean;
};

type Tab = "historial" | "config";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatSaleDate(sale: SaleRow) {
  const raw = sale.createdAt || sale.created_at || "";
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

async function generateReceipt(ticket: string, deliveryMethod: string): Promise<ReceiptResponse & { webhookStatus?: string }> {
  const res = await fetch("/api/receipts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket, deliveryMethod }),
  });
  if (!res.ok) throw new Error("Failed to generate receipt");
  return res.json();
}

function printReceiptHtml(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ComprobantesView() {
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = React.useState<Tab>("historial");

  return (
    <div className="flex h-full flex-col gap-4 animate-fade-in md:flex-row">
      {/* Sidebar tabs */}
      <div className="flex-shrink-0 overflow-hidden rounded-xl border border-bg-active bg-bg-panel md:w-56">
        <div className="px-4 py-3 border-b border-bg-active">
          <h2 className="text-sm font-bold text-text-primary tracking-wide">Comprobantes</h2>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:block md:space-y-0.5">
          <button
            onClick={() => setTab("historial")}
            className={`flex min-h-11 flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all md:w-full md:gap-3 ${
              tab === "historial"
                ? "bg-primary/15 text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-active"
            }`}
          >
            <Receipt className="w-4 h-4 flex-shrink-0" />
            Historial
          </button>
          <button
            onClick={() => setTab("config")}
            className={`flex min-h-11 flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all md:w-full md:gap-3 ${
              tab === "config"
                ? "bg-primary/15 text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-active"
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Configuración
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto">
        {tab === "historial" && <ReceiptHistory addToast={addToast} />}
        {tab === "config" && <ReceiptSettings addToast={addToast} />}
      </div>
    </div>
  );
}

/* ── Receipt History ────────────────────────────────────────────────────── */

function ReceiptHistory({ addToast }: { addToast: (msg: string, type?: "success" | "error") => void }) {
  const [sales, setSales] = React.useState<SaleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [showImport, setShowImport] = React.useState(false);

  const loadSales = React.useCallback(() => {
    setLoading(true);
    fetch("/api/sales?limit=500")
      .then((r) => r.json())
      .then((data) => setSales(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []))
      .catch(() => addToast("Error al cargar ventas", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  React.useEffect(() => { loadSales(); }, [loadSales]);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((s) => {
      const haystack = [s.ticket, s.method, s.createdBy || s.created_by, s.customerEmail || s.customer_email].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [query, sales]);

  const totals = React.useMemo(() => {
    return filtered.reduce((acc, s) => { acc.amount += Number(s.total) || 0; acc.count += 1; return acc; }, { amount: 0, count: 0 });
  }, [filtered]);

  const runAction = async (sale: SaleRow, action: "print" | "html" | "png" | "whatsapp" | "email" | "send") => {
    const key = `${sale.ticket}:${action}`;
    setBusyAction(key);
    try {
      const deliveryMethod = action === "print" ? "printed" : "digital";
      const receipt = await generateReceipt(sale.ticket, deliveryMethod);
      if (action === "print") { printReceiptHtml(receipt.html); addToast("Recibo abierto para imprimir", "success"); }
      if (action === "html") { downloadBlob(receipt.filename || `${sale.ticket}.html`, receipt.html, "text/html;charset=utf-8"); addToast("HTML descargado", "success"); }
      if (action === "png") {
        const blob = await fetch(`data:text/html;base64,${btoa(unescape(encodeURIComponent(receipt.html)))}`).then(r => r.blob());
        downloadBlob(`${sale.ticket}.html`, receipt.html, "text/html;charset=utf-8");
        addToast("Recibo descargado", "success");
      }
      if (action === "whatsapp") { window.open(receipt.whatsappUrl, "_blank", "noopener,noreferrer"); addToast("WhatsApp abierto", "success"); }
      if (action === "email") { window.location.href = receipt.mailtoUrl; addToast("Correo abierto", "success"); }
      if (action === "send") {
        const sent = await generateReceipt(sale.ticket, "comprobante-digital");
        addToast(sent.webhookStatus === "sent" ? "Comprobante enviado" : "Comprobante generado", "success");
      }
    } catch { addToast("No se pudo generar el comprobante", "error"); }
    finally { setBusyAction(null); }
  };

  const isBusy = (sale: SaleRow, action: string) => busyAction === `${sale.ticket}:${action}`;

  if (loading) {
    return (
      <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-bg-active bg-bg-panel">
      <div className="border-b border-bg-active px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">Historial de comprobantes</h3>
            <p className="mt-1 text-xs text-text-dim">Reimprime, descarga o comparte recibos de ventas cerradas.</p>
          </div>
          <button onClick={() => setShowImport(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bg-active px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-bg-section hover:text-text-primary">
            <Upload className="h-4 w-4" />
            Importar histórico
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ticket, método, cajero..." className="h-11 w-full rounded-lg border border-bg-active bg-bg pl-10 pr-3 text-sm text-text-secondary placeholder:text-text-dim focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-active px-3 py-2 text-xs text-text-dim">
            <span className="font-bold text-text-secondary">{filtered.length}</span> ventas
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-active px-3 py-2 text-xs text-text-dim">
            Total: <span className="font-bold text-green">{formatMoney(totals.amount)}</span>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-active text-xs uppercase tracking-wider text-text-dim">
              <th className="px-6 py-3 text-left font-medium">Ticket</th>
              <th className="px-6 py-3 text-left font-medium">Fecha</th>
              <th className="px-6 py-3 text-left font-medium">Método</th>
              <th className="px-6 py-3 text-right font-medium">Total</th>
              <th className="px-6 py-3 text-right font-medium">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sale) => (
              <tr key={sale.ticket} className="border-b border-bg-active/50 transition-colors hover:bg-bg-active/30">
                <td className="px-6 py-3 font-mono font-medium text-text-primary">{sale.ticket}</td>
                <td className="px-6 py-3 text-text-secondary">{formatSaleDate(sale)}</td>
                <td className="px-6 py-3 capitalize text-text-secondary">{sale.method}</td>
                <td className="px-6 py-3 text-right font-bold text-green">{formatMoney(sale.total)}</td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1.5">
                    <ActionBtn title="Imprimir" loading={isBusy(sale, "print")} onClick={() => runAction(sale, "print")} icon={Printer} />
                    <ActionBtn title="HTML" loading={isBusy(sale, "html")} onClick={() => runAction(sale, "html")} icon={Download} />
                    <ActionBtn title="PNG" loading={isBusy(sale, "png")} onClick={() => runAction(sale, "png")} icon={FileImage} />
                    <ActionBtn title="WhatsApp" loading={isBusy(sale, "whatsapp")} onClick={() => runAction(sale, "whatsapp")} icon={MessageCircle} />
                    <ActionBtn title="Email" loading={isBusy(sale, "email")} onClick={() => runAction(sale, "email")} icon={Mail} />
                    <ActionBtn title="Enviar" loading={isBusy(sale, "send")} onClick={() => runAction(sale, "send")} icon={Send} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-text-dim">No hay ventas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-3 lg:hidden">
        {filtered.map((sale) => (
          <div key={sale.ticket} className="rounded-lg border border-bg-active bg-bg p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-bold text-text-primary">{sale.ticket}</div>
                <div className="mt-1 text-xs text-text-dim">{formatSaleDate(sale)}</div>
                <div className="mt-1 text-xs capitalize text-text-secondary">{sale.method}</div>
              </div>
              <div className="text-right text-lg font-extrabold text-green">{formatMoney(sale.total)}</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MobileAction label="PDF" loading={isBusy(sale, "print")} onClick={() => runAction(sale, "print")} icon={Printer} />
              <MobileAction label="HTML" loading={isBusy(sale, "html")} onClick={() => runAction(sale, "html")} icon={Download} />
              <MobileAction label="PNG" loading={isBusy(sale, "png")} onClick={() => runAction(sale, "png")} icon={FileImage} />
              <MobileAction label="WhatsApp" loading={isBusy(sale, "whatsapp")} onClick={() => runAction(sale, "whatsapp")} icon={MessageCircle} />
              <MobileAction label="Email" loading={isBusy(sale, "email")} onClick={() => runAction(sale, "email")} icon={Mail} />
              <MobileAction label="Enviar" loading={isBusy(sale, "send")} onClick={() => runAction(sale, "send")} icon={Send} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-bg-active p-8 text-center text-sm text-text-dim">No hay ventas registradas</div>
        )}
      </div>

      {showImport && (
        <CsvSalesImport onClose={() => { setShowImport(false); loadSales(); }} />
      )}
    </div>
  );
}

/* ── Receipt Settings ───────────────────────────────────────────────────── */

function ReceiptSettings({ addToast }: { addToast: (msg: string, type?: "success" | "error") => void }) {
  const [config, setConfig] = React.useState<ReceiptConfig>({
    storeLogoUrl: "",
    webhookReceiptUrl: "",
    receiptDefaultDelivery: "digital",
    receiptPromptOnSale: true,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          storeLogoUrl: data.storeLogoUrl || "",
          webhookReceiptUrl: data.webhookReceiptUrl || "",
          receiptDefaultDelivery: data.receiptDefaultDelivery || "digital",
          receiptPromptOnSale: data.receiptPromptOnSale !== false,
        });
      })
      .catch(() => addToast("Error al cargar configuración", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  const set = (key: keyof ReceiptConfig, value: string | boolean) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) addToast("Configuración guardada", "success");
      else addToast("Error al guardar", "error");
    } catch { addToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-bg-active rounded-lg animate-pulse-slow" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
      <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
        <Receipt className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-base font-bold text-text-primary">Configuración de comprobantes</h3>
          <p className="text-xs text-text-dim">Ajustes de logo, envío y formato del comprobante digital.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        <Field label="URL del Logo (SVG/PNG)">
          <input type="url" value={config.storeLogoUrl} onChange={(e) => set("storeLogoUrl", e.target.value)} placeholder="https://..." className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
        </Field>

        <Field label="Webhook n8n (envío automático)">
          <input type="url" value={config.webhookReceiptUrl} onChange={(e) => set("webhookReceiptUrl", e.target.value)} placeholder="https://tu-n8n.com/webhook/..." className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Comprobante por defecto">
            <select value={config.receiptDefaultDelivery} onChange={(e) => set("receiptDefaultDelivery", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all">
              <option value="digital">Digital</option>
              <option value="printed">Impreso</option>
              <option value="ticket">Ticket</option>
            </select>
          </Field>

          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer pb-2.5">
              <input type="checkbox" checked={config.receiptPromptOnSale} onChange={(e) => set("receiptPromptOnSale", e.target.checked)} className="w-4 h-4 rounded bg-bg-active border-bg-active text-primary focus:ring-primary/20" />
              <span className="text-sm text-text-secondary">Preguntar al finalizar la venta</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Shared components ──────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ActionBtn({ title, loading, onClick, icon: Icon }: { title: string; loading: boolean; onClick: () => void; icon: React.ElementType }) {
  return (
    <button title={title} disabled={loading} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bg-active text-text-dim transition-all hover:bg-bg-active hover:text-text-secondary disabled:opacity-40 cursor-pointer">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
    </button>
  );
}

function MobileAction({ label, loading, onClick, icon: Icon }: { label: string; loading: boolean; onClick: () => void; icon: React.ElementType }) {
  return (
    <button disabled={loading} onClick={onClick} className="flex flex-col items-center gap-1 rounded-lg border border-bg-active bg-bg p-2.5 text-xs font-medium text-text-secondary transition-all hover:bg-bg-active cursor-pointer">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}
