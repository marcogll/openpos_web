import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Store,
  Receipt,
  Package,
  Users,
  Percent,
  Printer,
  UsersRound,
  Upload,
  Download,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Bluetooth,
  MonitorCog,
  Code2,
  Send,
  Search,
} from "lucide-react";
import { StoreConfig } from "./StoreConfig";
import { BillingConfig } from "./BillingConfig";
import { UserConfig } from "./UserConfig";
import { TaxConfig } from "./TaxConfig";
import { CsvProductImport } from "./CsvProductImport";
import { CsvSalesImport } from "./CsvSalesImport";
import { PrinterConfig } from "./PrinterConfig";
import { BarcodeConfig } from "./BarcodeConfig";
import { AppearanceConfig } from "./AppearanceConfig";
import { ApiReference } from "./ApiReference";
import { TelegramConfig } from "./TelegramConfig";
import { useUIStore } from "../../stores/uiStore";

type Section = "tienda" | "interfaz" | "api" | "telegram" | "facturacion" | "productos" | "usuarios" | "impuestos" | "impresora" | "escaner" | "clientes";

const MENU_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "tienda", label: "Tienda", icon: Store },
  { id: "interfaz", label: "Interfaz", icon: MonitorCog },
  { id: "api", label: "API Ref", icon: Code2 },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "facturacion", label: "Facturación", icon: Receipt },
  { id: "productos", label: "Productos", icon: Package },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "impuestos", label: "Impuestos", icon: Percent },
  { id: "impresora", label: "Impresora", icon: Printer },
  { id: "escaner", label: "Escáner/QR", icon: Bluetooth },
  { id: "clientes", label: "Clientes", icon: UsersRound },
];

const SECTION_ALIASES: Record<string, Section> = {
  store: "tienda",
  tienda: "tienda",
  appearance: "interfaz",
  interfaz: "interfaz",
  api: "api",
  apiref: "api",
  "api-ref": "api",
  telegram: "telegram",
  bot: "telegram",
  billing: "facturacion",
  facturacion: "facturacion",
  products: "productos",
  productos: "productos",
  users: "usuarios",
  usuarios: "usuarios",
  taxes: "impuestos",
  impuestos: "impuestos",
  printer: "impresora",
  impresora: "impresora",
  scanner: "escaner",
  escaner: "escaner",
  clientes: "clientes",
  clients: "clientes",
  client: "clientes",
};

function getSectionFromPath(pathname: string): Section {
  const rawSegment = pathname.split("/").filter(Boolean).at(-1) || "";
  const segment = rawSegment.toLowerCase().replace(/^settings-/, "");
  return SECTION_ALIASES[segment] || "tienda";
}

export function SettingsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = React.useState<Section>(() =>
    getSectionFromPath(location.pathname)
  );

  React.useEffect(() => {
    setActive(getSectionFromPath(location.pathname));
  }, [location.pathname]);

  const handleSectionChange = (section: Section) => {
    setActive(section);
    navigate(section === "tienda" ? "/settings" : `/settings/${section}`);
  };

  const renderContent = () => {
    switch (active) {
      case "tienda":
        return <StoreConfig />;
      case "interfaz":
        return <AppearanceConfig />;
      case "api":
        return <ApiReference />;
      case "telegram":
        return <TelegramConfig />;
      case "facturacion":
        return <BillingConfig />;
      case "productos":
        return <ProductToolsSection />;
      case "usuarios":
        return <UserConfig />;
      case "impuestos":
        return <TaxConfig />;
      case "impresora":
        return <PrinterConfig />;
      case "escaner":
        return <BarcodeConfig />;
      case "clientes":
        return <ClientToolsSection />;
      default:
        return <StoreConfig />;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 animate-fade-in md:flex-row">
      {/* Sidebar */}
      <div className="flex-shrink-0 overflow-hidden rounded-xl border border-bg-active bg-bg-panel md:w-56">
        <div className="px-4 py-3 border-b border-bg-active">
          <h2 className="text-sm font-bold text-text-primary tracking-wide">
            Configuración
          </h2>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:block md:space-y-0.5" aria-label="Secciones de configuración">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`flex min-h-11 flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all md:w-full md:gap-3 ${
                active === item.id
                  ? "bg-mauve/10 text-mauve"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-active"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto">{renderContent()}</div>
    </div>
  );
}

type ClientImportResult = {
  created: number;
  updated: number;
  rejected: number;
  errors: { line: number; rfc: string; reason: string }[];
};

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((values) => {
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    return item;
  });
}

function downloadCsv(filename: string, headers: string[], rows: any[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ProductToolsSection() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [showImport, setShowImport] = React.useState(false);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/products?limit=500");
      const data = await response.json();
      const products = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      const rows = products.map((product: any) => ({
        sku: product.sku,
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock ?? product.min_stock,
        unitType: product.unitType ?? product.unit_type,
        barcode: product.barcode,
      }));
      downloadCsv(
        `productos-${new Date().toISOString().slice(0, 10)}.csv`,
        ["sku", "name", "category", "price", "cost", "stock", "minStock", "unitType", "barcode"],
        rows
      );
      addToast("Productos exportados", "success");
    } catch {
      addToast("Error al exportar productos", "error");
    }
  };

  return (
    <>
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-mauve" />
            <h3 className="text-base font-bold text-text-primary">Ajustes de Productos</h3>
          </div>
          <button
            onClick={() => navigate("/inventory")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section hover:text-text-primary transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir inventario
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-6">
          <div className="border border-bg-active rounded-xl p-5 bg-bg/40">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-5 h-5 text-blue" />
              <h4 className="text-sm font-bold text-text-primary">Exportar CSV</h4>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-blue text-bg text-sm font-semibold hover:opacity-90 transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar productos
            </button>
          </div>

          <div className="border border-bg-active rounded-xl p-5 bg-bg/40">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-green" />
              <h4 className="text-sm font-bold text-text-primary">Importar CSV</h4>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-green text-bg text-sm font-semibold hover:opacity-90 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importar productos
            </button>
          </div>
        </div>
      </div>

      {showImport && (
        <CsvProductImport onClose={() => setShowImport(false)} />
      )}
    </>
  );
}

function ClientToolsSection() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [updateExisting, setUpdateExisting] = React.useState(true);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ClientImportResult | null>(null);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      const clients = Array.isArray(data.items) ? data.items : [];
      downloadCsv(
        `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
        ["code", "rfc", "razonSocial", "email", "telefono", "direccion", "regimenFiscal", "puntos"],
        clients
      );
      addToast("Clientes exportados", "success");
    } catch {
      addToast("Error al exportar clientes", "error");
    }
  };

  const handleFile = async (file: File | null) => {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    const parsed = parseCsv(await file.text());
    setRows(parsed);
    if (parsed.length === 0) addToast("CSV vacío o sin filas válidas", "error");
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      addToast("Selecciona un CSV primero", "error");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/import/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, updateExisting }),
      });
      const data = await response.json();
      if (!response.ok) {
        addToast(data.error || "Error al importar clientes", "error");
        return;
      }
      setResult(data);
      addToast(`Clientes importados: ${data.created} nuevos, ${data.updated} actualizados`, "success");
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsersRound className="w-5 h-5 text-mauve" />
            <h3 className="text-base font-bold text-text-primary">Ajustes de Clientes</h3>
          </div>
          <button
            onClick={() => navigate("/clients")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section hover:text-text-primary transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir clientes
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-6">
          <div className="border border-bg-active rounded-xl p-5 bg-bg/40">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-5 h-5 text-blue" />
              <h4 className="text-sm font-bold text-text-primary">Exportar CSV</h4>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-blue text-bg text-sm font-semibold hover:opacity-90 transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar clientes
            </button>
          </div>

          <div className="border border-bg-active rounded-xl p-5 bg-bg/40">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-green" />
              <h4 className="text-sm font-bold text-text-primary">Importar CSV</h4>
            </div>
            <label className="flex items-center justify-center gap-2 h-10 w-full rounded-lg border border-bg-active bg-bg text-text-secondary text-sm font-medium hover:bg-bg-active transition-all cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              {fileName || "Seleccionar archivo"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0] || null)}
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
                className="rounded border-bg-active bg-bg"
              />
              Actualizar RFC existentes
            </label>
            <button
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="mt-4 flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-green text-bg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Importando..." : `Importar ${rows.length || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-bg-panel rounded-xl border border-bg-active p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green/10 p-4">
              <div className="text-2xl font-bold text-green">{result.created}</div>
              <div className="text-xs text-text-dim">Nuevos</div>
            </div>
            <div className="rounded-lg bg-blue/10 p-4">
              <div className="text-2xl font-bold text-blue">{result.updated}</div>
              <div className="text-xs text-text-dim">Actualizados</div>
            </div>
            <div className="rounded-lg bg-red/10 p-4">
              <div className="text-2xl font-bold text-red">{result.rejected}</div>
              <div className="text-xs text-text-dim">Rechazados</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red/20 bg-red/5 p-3 text-xs text-red space-y-1">
              {result.errors.slice(0, 6).map((error) => (
                <div key={`${error.line}-${error.rfc}`}>Línea {error.line}: {error.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SalesSection() {
  const addToast = useUIStore((s) => s.addToast);
  const [sales, setSales] = React.useState<SaleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showImport, setShowImport] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [busyAction, setBusyAction] = React.useState<string | null>(null);

  const loadSales = React.useCallback(() => {
    setLoading(true);
    fetch("/api/sales?limit=500")
      .then((r) => r.json())
      .then((data) => setSales(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []))
      .catch(() => addToast("Error al cargar ventas", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  React.useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filteredSales = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale) => {
      const haystack = [
        sale.ticket,
        sale.method,
        sale.createdBy || sale.created_by,
        sale.customerEmail || sale.customer_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, sales]);

  const runReceiptAction = async (
    sale: SaleRow,
    action: "print" | "html" | "png" | "whatsapp" | "email" | "send"
  ) => {
    const key = `${sale.ticket}:${action}`;
    setBusyAction(key);
    try {
      const deliveryMethod = action === "print" ? "printed" : "digital";
      const receipt = await generateReceipt(sale.ticket, deliveryMethod);

      if (action === "print") {
        printReceiptHtml(receipt.html);
        addToast("Recibo abierto para imprimir o guardar PDF", "success");
      }
      if (action === "html") {
        downloadBlob(receipt.filename || `${sale.ticket}.html`, receipt.html, "text/html;charset=utf-8");
        addToast("Recibo HTML descargado", "success");
      }
      if (action === "png") {
        await downloadReceiptPng(receipt, sale.ticket);
        addToast("Recibo PNG descargado", "success");
      }
      if (action === "whatsapp") {
        window.open(receipt.whatsappUrl, "_blank", "noopener,noreferrer");
        addToast("WhatsApp abierto con el comprobante", "success");
      }
      if (action === "email") {
        window.location.href = receipt.mailtoUrl;
        addToast("Correo abierto con el comprobante", "success");
      }
      if (action === "send") {
        const sent = await generateReceipt(sale.ticket, "comprobante-digital");
        addToast(sent.webhookStatus === "sent" ? "Comprobante enviado" : "Comprobante generado", "success");
      }
    } catch {
      addToast("No se pudo generar el comprobante", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const totals = React.useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        acc.amount += Number(sale.total) || 0;
        acc.items += Number(sale.itemCount || sale.item_count) || 0;
        return acc;
      },
      { amount: 0, items: 0 }
    );
  }, [filteredSales]);

  const isBusy = (sale: SaleRow, action: string) => busyAction === `${sale.ticket}:${action}`;

  if (loading) {
    return (
      <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-bg-active bg-bg-panel">
        <div className="border-b border-bg-active px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary">Ventas y comprobantes</h3>
              <p className="mt-1 text-xs text-text-dim">
                Reimprime, descarga o comparte recibos de ventas cerradas.
              </p>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bg-active px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-bg-section hover:text-text-primary"
            >
              <Upload className="h-4 w-4" />
              Importar histórico
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar ticket, método, cajero o email..."
                className="h-11 w-full rounded-lg border border-bg-active bg-bg pl-10 pr-3 text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20"
              />
            </div>
            <SummaryPill label="Ventas" value={filteredSales.length.toString()} />
            <SummaryPill label="Total" value={formatMoney(totals.amount)} />
          </div>
        </div>

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
              {filteredSales.map((sale) => (
                <tr key={sale.ticket} className="border-b border-bg-active/50 transition-colors hover:bg-bg-active/30">
                  <td className="px-6 py-3 font-mono font-medium text-text-primary">{sale.ticket}</td>
                  <td className="px-6 py-3 text-text-secondary">{formatSaleDate(sale)}</td>
                  <td className="px-6 py-3 capitalize text-text-secondary">{sale.method}</td>
                  <td className="px-6 py-3 text-right font-bold text-green">{formatMoney(sale.total)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1.5">
                      <ReceiptAction title="PDF / imprimir" loading={isBusy(sale, "print")} onClick={() => runReceiptAction(sale, "print")} icon={Printer} />
                      <ReceiptAction title="Descargar HTML" loading={isBusy(sale, "html")} onClick={() => runReceiptAction(sale, "html")} icon={Download} />
                      <ReceiptAction title="Descargar PNG" loading={isBusy(sale, "png")} onClick={() => runReceiptAction(sale, "png")} icon={FileImage} />
                      <ReceiptAction title="WhatsApp" loading={isBusy(sale, "whatsapp")} onClick={() => runReceiptAction(sale, "whatsapp")} icon={MessageCircle} />
                      <ReceiptAction title="Email" loading={isBusy(sale, "email")} onClick={() => runReceiptAction(sale, "email")} icon={Mail} />
                      <ReceiptAction title="Enviar digital" loading={isBusy(sale, "send")} onClick={() => runReceiptAction(sale, "send")} icon={Send} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-dim">
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 lg:hidden">
          {filteredSales.map((sale) => (
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
                <MobileReceiptAction label="PDF" loading={isBusy(sale, "print")} onClick={() => runReceiptAction(sale, "print")} icon={Printer} />
                <MobileReceiptAction label="HTML" loading={isBusy(sale, "html")} onClick={() => runReceiptAction(sale, "html")} icon={Download} />
                <MobileReceiptAction label="PNG" loading={isBusy(sale, "png")} onClick={() => runReceiptAction(sale, "png")} icon={FileImage} />
                <MobileReceiptAction label="WhatsApp" loading={isBusy(sale, "whatsapp")} onClick={() => runReceiptAction(sale, "whatsapp")} icon={MessageCircle} />
                <MobileReceiptAction label="Email" loading={isBusy(sale, "email")} onClick={() => runReceiptAction(sale, "email")} icon={Mail} />
                <MobileReceiptAction label="Enviar" loading={isBusy(sale, "send")} onClick={() => runReceiptAction(sale, "send")} icon={Send} />
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && (
            <div className="rounded-lg border border-dashed border-bg-active p-8 text-center text-sm text-text-dim">
              No hay ventas registradas
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <CsvSalesImport
          onClose={() => {
            setShowImport(false);
            loadSales();
          }}
        />
      )}
    </>
  );
}

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

async function generateReceipt(ticket: string, deliveryMethod: string): Promise<ReceiptResponse & { webhookStatus?: string }> {
  const res = await fetch("/api/receipts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket, deliveryMethod }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.receipt?.html) throw new Error("Receipt generation failed");
  return { ...data.receipt, webhookStatus: data.webhookStatus };
}

function printReceiptHtml(html: string) {
  const win = window.open("", "_blank", "width=420,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadReceiptPng(receipt: ReceiptResponse, ticket: string) {
  const canvas = document.createElement("canvas");
  const width = 900;
  const lines = receipt.text.split("\n");
  const height = Math.max(900, 180 + lines.length * 34);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.fillStyle = "#faf7f3";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1c1a19";
  ctx.textAlign = "center";
  ctx.font = "700 42px Georgia, serif";
  ctx.fillText("Vanity", width / 2, 78);
  ctx.font = "600 18px Arial, sans-serif";
  ctx.fillStyle = "#8a6a3c";
  ctx.fillText("NAILS & SPA", width / 2, 112);
  ctx.strokeStyle = "#e4dcd3";
  ctx.beginPath();
  ctx.moveTo(80, 142);
  ctx.lineTo(width - 80, 142);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = "500 25px Arial, sans-serif";
  let y = 190;
  for (const line of lines) {
    ctx.fillStyle = line.toLowerCase().startsWith("total:") ? "#8a6a3c" : "#1c1a19";
    ctx.font = line.toLowerCase().startsWith("total:") ? "700 34px Georgia, serif" : "500 25px Arial, sans-serif";
    ctx.fillText(line || " ", 80, y);
    y += line.toLowerCase().startsWith("total:") ? 44 : 34;
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG generation failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${ticket}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-11 min-w-32 items-center justify-between gap-3 rounded-lg border border-bg-active bg-bg px-3">
      <span className="text-xs font-medium text-text-dim">{label}</span>
      <span className="font-bold text-text-primary">{value}</span>
    </div>
  );
}

function ReceiptAction({
  title,
  loading,
  onClick,
  icon: Icon,
}: {
  title: string;
  loading: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={loading}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-bg-active bg-bg text-text-muted transition-colors hover:bg-bg-active hover:text-text-primary disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MobileReceiptAction({
  label,
  loading,
  onClick,
  icon: Icon,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-bg-active bg-bg-panel px-2 text-xs font-bold text-text-secondary transition-colors hover:bg-bg-active disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function formatSaleDate(sale: SaleRow) {
  const raw = sale.createdAt || sale.created_at;
  if (!raw) return "Sin fecha";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("es-MX");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value) || 0);
}
