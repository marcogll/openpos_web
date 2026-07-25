import React from "react";
import { AlertTriangle, ArrowRight, Package, Search } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Product = {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  category: string;
  stock: number;
  minStock: number | null;
  unitType: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  MAQ: "Maquillaje",
  CFA: "Cuidado Facial",
  CAB: "Cabello",
  UNA: "Uñas",
  SPA: "Spa/Tratamientos",
  HER: "Herramientas",
  ACC: "Accesorios",
  SER: "Servicios",
};

export function LowStockAlert({ onNavigate }: { onNavigate: (tab: "adjust" | "count" | "entry" | "history") => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    fetch("/api/inventory/low-stock")
      .then((r) => r.json())
      .then((data) => setProducts(data.items || []))
      .catch(() => addToast("Error al cargar productos con bajo stock", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (CATEGORY_LABELS[p.category] || p.category).toLowerCase().includes(search.toLowerCase())
  );

  const criticalCount = products.filter((p) => p.stock === 0).length;
  const warningCount = products.filter((p) => p.stock > 0).length;

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Productos con Bajo Stock</h3>
              <p className="text-xs text-text-dim">Productos por debajo del mínimo configurado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red/10 text-red text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
                {criticalCount} sin stock
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber/10 text-amber text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-amber" />
                {warningCount} bajo mínimo
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("entry")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green/10 text-green text-xs font-medium hover:bg-green/20 transition-all"
          >
            <Package className="w-3.5 h-3.5" />
            Entrada rápida
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => onNavigate("adjust")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue/10 text-blue text-xs font-medium hover:bg-blue/20 transition-all"
          >
            Ajustar stock
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-bg-active/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-bg-active rounded-lg animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">SKU</th>
                <th className="text-left px-6 py-3 font-medium">Producto</th>
                <th className="text-left px-6 py-3 font-medium">Categoría</th>
                <th className="text-right px-6 py-3 font-medium">Stock Actual</th>
                <th className="text-right px-6 py-3 font-medium">Mínimo</th>
                <th className="text-right px-6 py-3 font-medium">Faltante</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const deficit = (p.minStock || 0) - p.stock;
                const isOut = p.stock === 0;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors ${
                      isOut ? "bg-red/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-mono text-text-muted text-xs">{p.sku}</td>
                    <td className="px-6 py-3 text-text-primary font-medium">{p.name}</td>
                    <td className="px-6 py-3 text-text-secondary text-xs">
                      {CATEGORY_LABELS[p.category] || p.category}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold ${
                          isOut ? "text-red" : "text-amber"
                        }`}
                      >
                        {isOut && <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />}
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-text-dim">{p.minStock || 0}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-red font-semibold">-{deficit}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-green" />
                      </div>
                      <p className="text-sm text-text-dim font-medium">
                        {search ? "No se encontraron productos" : "Todos los productos tienen stock suficiente"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
