import React from "react";
import {
  Banknote,
  Plus, Minus, LogIn, LogOut,
  DollarSign, TrendingDown, TrendingUp, History, RefreshCw,
  ChevronLeft, ChevronRight,
} from "lucide-react";

type Movement = {
  id: number;
  type: string;
  amount: number;
  method: string | null;
  reference: string | null;
  description: string | null;
  sale_id: number | null;
  created_at: string;
  created_by: string;
};

type Summary = {
  date: string;
  sales: Record<string, { total: number; count: number }>;
  movements: Record<string, { total: number; count: number }>;
  opening: Movement | null;
  closing: Movement | null;
};

const TYPE_LABELS: Record<string, string> = {
  opening: "Apertura",
  closing: "Cierre",
  entry: "Entrada",
  exit: "Salida",
};

const TYPE_COLORS: Record<string, string> = {
  opening: "bg-green/10 text-green",
  closing: "bg-blue/10 text-blue",
  entry: "bg-emerald/10 text-emerald",
  exit: "bg-red/10 text-red",
};

export function CashRegisterView() {
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [showNewModal, setShowNewModal] = React.useState<"entry" | "exit" | null>(null);
  const [showOpenModal, setShowOpenModal] = React.useState(false);
  const [showCloseModal, setShowCloseModal] = React.useState(false);
  const [formAmount, setFormAmount] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [closingActual, setClosingActual] = React.useState("");

  const fetchData = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30", date });
    Promise.all([
      fetch(`/api/cash?${params}`).then((r) => r.json()),
      fetch(`/api/cash/summary?date=${date}`).then((r) => r.json()),
    ]).then(([movData, sumData]) => {
      setMovements(movData.items || []);
      setTotalPages(movData.totalPages || 1);
      setSummary(sumData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, date]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const recordMovement = async (type: "entry" | "exit") => {
    if (!formAmount || Number(formAmount) <= 0) return;
    await fetch("/api/cash/movement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(formAmount), description: formDesc }),
    });
    setShowNewModal(null);
    setFormAmount("");
    setFormDesc("");
    fetchData();
  };

  const openRegister = async () => {
    await fetch("/api/cash/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(formAmount) || 0, description: formDesc || "Apertura de caja" }),
    });
    setShowOpenModal(false);
    setFormAmount("");
    setFormDesc("");
    fetchData();
  };

  const closeRegister = async () => {
    const cashSales = Number(summary?.sales?.efectivo?.total || 0);
    const entries = Number(summary?.movements?.entry?.total || 0);
    const openings = Number(summary?.opening?.amount || 0);
    const exits = Number(summary?.movements?.exit?.total || 0);
    const expected = openings + cashSales + entries - exits;
    const actual = Number(closingActual);
    await fetch("/api/cash/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedCash: expected, actualCash: actual, difference: actual - expected, description: formDesc || "Cierre de caja" }),
    });
    setShowCloseModal(false);
    setFormDesc("");
    setClosingActual("");
    fetchData();
  };

  const calcExpectedCash = () => {
    if (!summary) return 0;
    const opening = Number(summary.opening?.amount || 0);
    const cashSales = Number(summary.sales?.efectivo?.total || 0);
    const entries = Number(summary.movements?.entry?.total || 0);
    const exits = Number(summary.movements?.exit?.total || 0);
    return opening + cashSales + entries - exits;
  };

  const totalEntries = movements.filter((m) => m.type === "entry").reduce((s, m) => s + m.amount, 0);
  const totalExits = movements.filter((m) => m.type === "exit").reduce((s, m) => s + m.amount, 0);

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 bg-bg-panel rounded-xl border border-bg-active px-4 py-3">
        <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
          <Banknote className="w-4 h-4 text-mauve" />
          Corte de Caja
        </div>

        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary outline-none"
        />

        <button onClick={() => setShowOpenModal(true)} disabled={!!summary?.opening}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green/10 text-green text-xs font-semibold hover:bg-green/20 transition-all disabled:opacity-30"
        ><LogIn className="w-3.5 h-3.5" /> Apertura</button>

        <button onClick={() => setShowCloseModal(true)} disabled={!!summary?.closing || !summary?.opening}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-blue/10 text-blue text-xs font-semibold hover:bg-blue/20 transition-all disabled:opacity-30"
        ><LogOut className="w-3.5 h-3.5" /> Cierre</button>

        <div className="flex-1" />

        <button onClick={() => setShowNewModal("entry")}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald/10 text-emerald text-xs font-semibold hover:bg-emerald/20 transition-all"
        ><Plus className="w-3.5 h-3.5" /> Entrada</button>

        <button onClick={() => setShowNewModal("exit")}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red/10 text-red text-xs font-semibold hover:bg-red/20 transition-all"
        ><Minus className="w-3.5 h-3.5" /> Salida</button>

        <button onClick={fetchData} className="p-2 rounded-lg bg-bg-active text-text-secondary hover:bg-bg-section transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Efectivo</div>
            <div className="text-lg font-bold text-text-primary">${summary.sales?.efectivo?.total?.toFixed(2) || "0.00"}</div>
            <div className="text-[10px] text-text-dim">{summary.sales?.efectivo?.count || 0} ventas</div>
          </div>
          <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Tarjeta</div>
            <div className="text-lg font-bold text-blue">${summary.sales?.tarjeta?.total?.toFixed(2) || "0.00"}</div>
            <div className="text-[10px] text-text-dim">{summary.sales?.tarjeta?.count || 0} ventas</div>
          </div>
          <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Transferencia</div>
            <div className="text-lg font-bold text-purple">${summary.sales?.["transf."]?.total?.toFixed(2) || "0.00"}</div>
            <div className="text-[10px] text-text-dim">{summary.sales?.["transf."]?.count || 0} ventas</div>
          </div>
          <div className="bg-bg-panel rounded-xl border border-bg-active p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">QR/CoDi</div>
            <div className="text-lg font-bold text-amber">${summary.sales?.["qr/codi"]?.total?.toFixed(2) || "0.00"}</div>
            <div className="text-[10px] text-text-dim">{summary.sales?.["qr/codi"]?.count || 0} ventas</div>
          </div>
          <div className="bg-bg-panel rounded-xl border-l-4 border-l-mauve border border-bg-active p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Esperado en caja</div>
            <div className="text-lg font-bold text-mauve">${calcExpectedCash().toFixed(2)}</div>
            <div className="text-[10px] text-text-dim">
              {summary.opening ? "Abierta" : "Sin apertura"}
              {summary.closing ? " · Cerrada" : ""}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-bg-panel rounded-xl border border-bg-active">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-bg-active rounded animate-pulse-slow" />)}</div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-bg-section/95 backdrop-blur text-text-dim text-[10px] uppercase tracking-wider border-b border-bg-active">
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-left font-medium">Método</th>
                <th className="px-3 py-2 text-left font-medium">Referencia</th>
                <th className="px-3 py-2 text-left font-medium">Descripción</th>
                <th className="px-3 py-2 text-right font-medium">Hora</th>
                <th className="px-3 py-2 text-left font-medium">Cajero</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-bg-active/30 hover:bg-bg-active/20 transition-colors">
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[m.type]}`}>
                      {TYPE_LABELS[m.type] || m.type}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-xs text-right font-mono font-bold ${m.type === "exit" ? "text-red" : m.type === "entry" ? "text-emerald" : "text-text-primary"}`}>
                    {m.type === "exit" ? "-" : "+"}${m.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">{m.method || "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono text-text-dim">{m.reference || "—"}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary max-w-40 truncate">{m.description || "—"}</td>
                  <td className="px-3 py-2 text-xs text-text-muted text-right">{new Date(m.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">{m.created_by}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-text-dim text-sm">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>{movements.length} movimientos</span>
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

      {/* New movement modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-bg-panel rounded-2xl border border-bg-active p-6 w-80 animate-scale-in">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              {showNewModal === "entry" ? <Plus className="w-4 h-4 text-emerald" /> : <Minus className="w-4 h-4 text-red" />}
              Registrar {showNewModal === "entry" ? "Entrada" : "Salida"}
            </h3>
            <input
              type="number" step="0.01" min="0" placeholder="Monto" value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-2 focus:border-mauve/30"
              autoFocus
            />
            <input
              type="text" placeholder="Descripción (opcional)" value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-4 focus:border-mauve/30"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowNewModal(null); setFormAmount(""); setFormDesc(""); }}
                className="flex-1 h-9 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >Cancelar</button>
              <button onClick={() => recordMovement(showNewModal)}
                className="flex-1 h-9 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
              >Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Open modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-bg-panel rounded-2xl border border-bg-active p-6 w-80 animate-scale-in">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-green" />
              Apertura de Caja
            </h3>
            <input
              type="number" step="0.01" min="0" placeholder="Monto inicial" value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-2 focus:border-mauve/30"
              autoFocus
            />
            <input
              type="text" placeholder="Nota (opcional)" value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-4 focus:border-mauve/30"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowOpenModal(false); setFormAmount(""); setFormDesc(""); }}
                className="flex-1 h-9 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >Cancelar</button>
              <button onClick={openRegister}
                className="flex-1 h-9 rounded-lg bg-green text-bg text-sm font-semibold hover:opacity-90 transition-all"
              >Abrir Caja</button>
            </div>
          </div>
        </div>
      )}

      {/* Close modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-bg-panel rounded-2xl border border-bg-active p-6 w-96 animate-scale-in">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-blue" />
              Cierre de Caja — {date}
            </h3>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1 border-b border-bg-active/30">
                <span className="text-text-muted">Apertura</span>
                <span className="font-mono font-medium text-text-secondary">${Number(summary?.opening?.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-bg-active/30">
                <span className="text-text-muted">Ventas efectivo</span>
                <span className="font-mono font-medium text-green">+${Number(summary?.sales?.efectivo?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-bg-active/30">
                <span className="text-text-muted">Entradas extra</span>
                <span className="font-mono font-medium text-emerald">+${Number(summary?.movements?.entry?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-bg-active/30">
                <span className="text-text-muted">Salidas</span>
                <span className="font-mono font-medium text-red">-${Number(summary?.movements?.exit?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-text-primary">
                <span>Efectivo esperado</span>
                <span className="font-mono">${calcExpectedCash().toFixed(2)}</span>
              </div>
            </div>

            <input
              type="number" step="0.01" min="0" placeholder="Efectivo real en caja" value={closingActual}
              onChange={(e) => setClosingActual(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-2 focus:border-mauve/30"
              autoFocus
            />
            {closingActual && (
              <div className={`text-xs mb-4 text-center font-mono font-bold ${(Number(closingActual) - calcExpectedCash()) >= 0 ? "text-green" : "text-red"}`}>
                Diferencia: ${(Number(closingActual) - calcExpectedCash()).toFixed(2)}
              </div>
            )}
            <input
              type="text" placeholder="Nota de cierre (opcional)" value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary outline-none mb-4 focus:border-mauve/30"
            />

            <div className="flex gap-2">
              <button onClick={() => { setShowCloseModal(false); setClosingActual(""); setFormDesc(""); }}
                className="flex-1 h-9 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >Cancelar</button>
              <button onClick={closeRegister} disabled={!closingActual}
                className="flex-1 h-9 rounded-lg bg-blue text-bg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >Cerrar Caja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
