import React from "react";
import { Search, Download, ChevronLeft, ChevronRight, DollarSign, TrendingUp, ReceiptText } from "lucide-react";

type Sale = {
  ticket: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  received: number;
  change: number;
  method: string;
  status: string;
  items: any[];
  item_count: number;
  created_at: string;
  created_by: string;
  customer_rfc: string | null;
  customer_razon_social: string | null;
  cost?: number;
  profit?: number;
  marginPct?: number;
};

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  "transf.": "Transferencia",
  "qr/codi": "QR/CoDi",
  otro: "Otro",
};

const METHOD_COLORS: Record<string, string> = {
  efectivo: "bg-green/10 text-green",
  tarjeta: "bg-blue/10 text-blue",
  "transf.": "bg-purple/10 text-purple",
  "qr/codi": "bg-amber/10 text-amber",
  otro: "bg-text-dim/10 text-text-dim",
};

export function SalesLogView() {
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const limit = 25;

  const fetchSales = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit), includeCost: "true" });
    if (date) params.set("date", date);
    if (method) params.set("method", method);

    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSales(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, date, method]);

  React.useEffect(() => { fetchSales(); }, [fetchSales]);

  const filtered = search
    ? sales.filter((s) => s.ticket.toLowerCase().includes(search.toLowerCase()) || s.created_by?.toLowerCase().includes(search.toLowerCase()))
    : sales;

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalCost = sales.reduce((sum, s) => sum + (s.cost || 0), 0);

  const exportCsv = () => {
    const headers = ["Ticket", "Fecha", "Método", "Subtotal", "IVA", "Total", "Costo", "Utilidad", "Margen%", "Artículos", "Cajero"];
    const csv = [
      headers.join(","),
      ...sales.map((s) => [
        s.ticket, s.created_at, s.method, s.subtotal, s.tax, s.total,
        s.cost || 0, s.profit || 0, s.marginPct || 0, s.item_count, s.created_by,
      ].map((v) => `"${v ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ventas-${date}.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 bg-bg-panel rounded-xl border border-bg-active px-4 py-3">
        <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
          <ReceiptText className="w-4 h-4 text-mauve" />
          Ventas
          <span className="text-text-muted font-normal ml-1">({sales.length})</span>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ticket..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary outline-none focus:border-mauve/30"
          />
        </div>

        <input
          type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary outline-none"
        />

        <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary outline-none"
        >
          <option value="">Todos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transf.">Transferencia</option>
          <option value="qr/codi">QR/CoDi</option>
        </select>

        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Ingresos</div>
          <div className="text-lg font-bold text-green">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Costo</div>
          <div className="text-lg font-bold text-amber">${totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Utilidad</div>
          <div className="text-lg font-bold text-mauve">${totalProfit.toFixed(2)}</div>
        </div>
        <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Margen</div>
          <div className="text-lg font-bold text-text-primary">{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0"}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-bg-panel rounded-xl border border-bg-active">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-bg-active rounded animate-pulse-slow" />)}</div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-bg-section/95 backdrop-blur text-text-dim text-[10px] uppercase tracking-wider border-b border-bg-active">
                <th className="px-3 py-2 w-24 text-left font-medium">Ticket</th>
                <th className="px-3 py-2 text-left font-medium">Hora</th>
                <th className="px-3 py-2 text-left font-medium">Método</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                <th className="px-3 py-2 text-right font-medium">IVA</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Costo</th>
                <th className="px-3 py-2 text-right font-medium">Utilidad</th>
                <th className="px-3 py-2 text-right font-medium">Margen</th>
                <th className="px-3 py-2 text-left font-medium">Cajero</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isService = s.items.every((i: any) => i.category === "SER" || i.unitType === "servicio");
                return (
                  <React.Fragment key={s.ticket}>
                    <tr
                      onClick={() => setExpanded(expanded === s.ticket ? null : s.ticket)}
                      className="border-b border-bg-active/30 hover:bg-bg-active/20 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 font-mono text-xs font-medium text-text-secondary">{s.ticket}</td>
                      <td className="px-3 py-2 text-xs text-text-muted">{new Date(s.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${METHOD_COLORS[s.method] || METHOD_COLORS.otro}`}>
                          {METHOD_LABELS[s.method] || s.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-text-muted font-mono">${s.subtotal.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right text-text-muted font-mono">${s.tax.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-bold text-text-primary">${s.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-amber">${(s.cost || 0).toFixed(2)}</td>
                      <td className={`px-3 py-2 text-xs text-right font-mono font-medium ${(s.profit || 0) >= 0 ? "text-green" : "text-red"}`}>
                        ${(s.profit || 0).toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-xs text-right font-mono font-medium ${(s.marginPct || 0) >= 20 ? "text-green" : (s.marginPct || 0) > 0 ? "text-amber" : "text-red"}`}>
                        {s.marginPct}%
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">{s.created_by}</td>
                    </tr>
                    {expanded === s.ticket && (
                      <tr key={`${s.ticket}-detail`} className="bg-bg-active/10">
                        <td colSpan={10} className="px-6 py-3">
                          <div className="text-xs space-y-1.5">
                            <div className="text-text-muted mb-1">Artículos vendidos:</div>
                            {s.items.map((item: any, i: number) => (
                              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 text-text-secondary">
                                <span>{item.name}</span>
                                <span className="font-mono text-text-dim">SKU: {item.sku}</span>
                                <span className="text-right font-mono">${item.price.toFixed(2)}</span>
                                <span className="text-right font-mono">x{item.qty}</span>
                                <span className="text-right font-mono font-medium">${(item.price * item.qty).toFixed(2)}</span>
                              </div>
                            ))}
                            {s.customer_razon_social && (
                              <div className="pt-2 border-t border-bg-active/30 text-text-dim mt-2">
                                Cliente: {s.customer_razon_social} {s.customer_rfc ? `(${s.customer_rfc})` : ""}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-text-dim text-sm">Sin ventas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>{filtered.length} de {sales.length} ventas</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-lg bg-bg-active hover:bg-bg-section disabled:opacity-30 transition-all"
          ><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-text-secondary font-medium">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-lg bg-bg-active hover:bg-bg-section disabled:opacity-30 transition-all"
          ><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
