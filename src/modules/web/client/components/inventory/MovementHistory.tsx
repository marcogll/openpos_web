import React from "react";
import { History, ArrowUpDown, ClipboardList, PackagePlus, Filter } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Movement = {
  id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  cost: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeClass: string; filterActive: string }> = {
  adjustment: { label: "Ajuste", icon: ArrowUpDown, badgeClass: "bg-blue/10 text-blue", filterActive: "bg-blue/15 text-blue" },
  count: { label: "Conteo", icon: ClipboardList, badgeClass: "bg-amber/10 text-amber", filterActive: "bg-amber/15 text-amber" },
  entry: { label: "Entrada", icon: PackagePlus, badgeClass: "bg-green/10 text-green", filterActive: "bg-green/15 text-green" },
};

export function MovementHistory() {
  const addToast = useUIStore((s) => s.addToast);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 30;

  const fetchMovements = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setMovements(data.items || []);
      setTotal(data.total || 0);
    } catch {
      addToast("Error al cargar historial", "error");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, addToast]);

  React.useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mauve/10 flex items-center justify-center">
            <History className="w-5 h-5 text-mauve" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Historial de Movimientos</h3>
            <p className="text-xs text-text-dim">{total} movimientos registrados</p>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-bg rounded-lg p-0.5 border border-bg-active">
          <button
            onClick={() => { setTypeFilter(""); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !typeFilter ? "bg-mauve/15 text-mauve" : "text-text-dim hover:text-text-secondary"
            }`}
          >
            Todos
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setTypeFilter(key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === key ? val.filterActive : "text-text-dim hover:text-text-secondary"
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Fecha</th>
                <th className="text-left px-6 py-3 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 font-medium">Producto</th>
                <th className="text-right px-6 py-3 font-medium">Anterior</th>
                <th className="text-right px-6 py-3 font-medium">Nuevo</th>
                <th className="text-right px-6 py-3 font-medium">Cambio</th>
                <th className="text-left px-6 py-3 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const typeInfo = TYPE_CONFIG[m.type] || { label: m.type, icon: ArrowUpDown, badgeClass: "bg-mauve/10 text-mauve", filterActive: "" };
                const TypeIcon = typeInfo.icon;
                const diff = m.new_stock - m.previous_stock;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                  >
                    <td className="px-6 py-3 text-text-secondary text-xs">
                      {new Date(m.created_at).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${typeInfo.badgeClass}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-text-primary font-medium">{m.product_name || m.product_sku}</span>
                      <span className="text-text-dim text-xs ml-1.5 font-mono">{m.product_sku}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-text-dim font-mono">{m.previous_stock}</td>
                    <td className="px-6 py-3 text-right text-text-secondary font-mono font-bold">{m.new_stock}</td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`font-bold ${diff > 0 ? "text-green" : diff < 0 ? "text-red" : "text-text-dim"}`}
                      >
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-text-dim text-xs max-w-48 truncate">
                      {m.note || "—"}
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-dim">
                    No hay movimientos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-bg-active flex items-center justify-between">
          <span className="text-xs text-text-dim">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
