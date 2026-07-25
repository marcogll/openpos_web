import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Store,
  Receipt,
  Package,
  Users,
  Percent,
  Printer,
  TrendingUp,
  UsersRound,
  Upload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Bluetooth,
  MonitorCog,
  Code2,
  Send,
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

type Section = "tienda" | "interfaz" | "api" | "telegram" | "facturacion" | "productos" | "usuarios" | "impuestos" | "impresora" | "escaner" | "ventas" | "clientes";

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
  { id: "ventas", label: "Ventas", icon: TrendingUp },
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
  ventas: "ventas",
  sales: "ventas",
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
      case "ventas":
        return <SalesSection />;
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
  const [sales, setSales] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showImport, setShowImport] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/sales?limit=500")
      .then((r) => r.json())
      .then((data) => setSales(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">Historial de Ventas</h3>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section hover:text-text-primary transition-all"
          >
            <Upload className="w-4 h-4" />
            Importar histórico
          </button>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Ticket</th>
                <th className="text-left px-6 py-3 font-medium">Fecha</th>
                <th className="text-left px-6 py-3 font-medium">Método</th>
                <th className="text-right px-6 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                >
                  <td className="px-6 py-3 text-text-primary font-mono font-medium">
                    {sale.ticket}
                  </td>
                  <td className="px-6 py-3 text-text-secondary">
                    {new Date(sale.createdAt).toLocaleString("es-MX")}
                  </td>
                  <td className="px-6 py-3 text-text-secondary capitalize">
                    {sale.method}
                  </td>
                  <td className="px-6 py-3 text-right text-green font-bold">
                    ${Number(sale.total).toFixed(2)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-dim">
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && (
        <CsvSalesImport
          onClose={() => {
            setShowImport(false);
            fetch("/api/sales?limit=500")
              .then((r) => r.json())
              .then((data) => setSales(data.items || data))
              .catch(() => {});
          }}
        />
      )}
    </>
  );
}
