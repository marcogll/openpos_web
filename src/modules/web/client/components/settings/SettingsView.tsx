import React from "react";
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
} from "lucide-react";
import { StoreConfig } from "./StoreConfig";
import { BillingConfig } from "./BillingConfig";
import { ProductConfig } from "./ProductConfig";
import { UserConfig } from "./UserConfig";
import { TaxConfig } from "./TaxConfig";
import { ClientConfig } from "./ClientConfig";
import { CsvSalesImport } from "./CsvSalesImport";
import { PrinterConfig } from "./PrinterConfig";

type Section = "tienda" | "facturacion" | "productos" | "usuarios" | "impuestos" | "impresora" | "ventas" | "clientes";

const MENU_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "tienda", label: "Tienda", icon: Store },
  { id: "facturacion", label: "Facturación", icon: Receipt },
  { id: "productos", label: "Productos", icon: Package },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "impuestos", label: "Impuestos", icon: Percent },
  { id: "impresora", label: "Impresora", icon: Printer },
  { id: "ventas", label: "Ventas", icon: TrendingUp },
  { id: "clientes", label: "Clientes", icon: UsersRound },
];

export function SettingsView() {
  const [active, setActive] = React.useState<Section>("tienda");

  const renderContent = () => {
    switch (active) {
      case "tienda":
        return <StoreConfig />;
      case "facturacion":
        return <BillingConfig />;
      case "productos":
        return <ProductConfig />;
      case "usuarios":
        return <UserConfig />;
      case "impuestos":
        return <TaxConfig />;
      case "impresora":
        return <PrinterConfig />;
      case "ventas":
        return <SalesSection />;
      case "clientes":
        return <ClientConfig />;
      default:
        return <StoreConfig />;
    }
  };

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-4 py-3 border-b border-bg-active">
          <h2 className="text-sm font-bold text-text-primary tracking-wide">
            Configuración
          </h2>
        </div>
        <nav className="p-2 space-y-0.5">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
