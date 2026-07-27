import React from "react";
import {
  CreditCard, Landmark, Smartphone, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Download, FileText,
} from "lucide-react";

type Cut = {
  method: string;
  count: number;
  total: number;
};

const CUT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  tarjeta: { label: "Tarjeta", icon: CreditCard, color: "text-blue" },
  "transf.": { label: "Transferencia", icon: Landmark, color: "text-purple" },
  "qr/codi": { label: "QR/CoDi", icon: Smartphone, color: "text-amber" },
};

export function PaymentCutView() {
  const [cuts, setCuts] = React.useState<Cut[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = React.useState<{ date: string; cuts: Cut[] }[]>([]);
  const [historyPage, setHistoryPage] = React.useState(1);
  const HOUR = 3600000;

  const fetchCuts = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cash/cuts?date=${date}`).then((r) => r.json()),
      fetch(`/api/sales?page=${historyPage}&limit=5&includeCost=true`).then((r) => r.json()),
    ]).then(([cutData, salesData]) => {
      setCuts(cutData.cuts || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [date]);

  React.useEffect(() => { fetchCuts(); }, [fetchCuts]);

  const totalCuts = cuts.reduce((s, c) => s + c.total, 0);
  const totalCount = cuts.reduce((s, c) => s + c.count, 0);

  const exportPdf = () => {
    const content = `
CORTE DE TARJETA Y TRANSFERENCIAS
Fecha: ${date}
${"─".repeat(40)}

${cuts.map((c) => {
  const meta = CUT_META[c.method] || { label: c.method, color: "text-text-primary" };
  return `${meta.label}
  Transacciones: ${c.count}
  Total: $${c.total.toFixed(2)}
  Comisión (3%): $${(c.total * 0.03).toFixed(2)}
  Neto: $${(c.total * 0.97).toFixed(2)}
${"─".repeat(40)}`;
}).join("\n")}

TOTAL CORTE: $${totalCuts.toFixed(2)}
TOTAL TRANSACCIONES: ${totalCount}
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `corte-tarjeta-${date}.txt`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 bg-bg-panel rounded-xl border border-bg-active px-4 py-3">
        <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
          <CreditCard className="w-4 h-4 text-mauve" />
          Corte de Tarjeta / Transferencia
        </div>

        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-8 px-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary outline-none"
        />

        <button onClick={exportPdf}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all"
        ><Download className="w-3.5 h-3.5" /> Exportar</button>
      </div>

      {/* Cuts grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-bg-panel rounded-xl border border-bg-active animate-pulse-slow p-4" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {cuts.map((cut) => {
            const meta = CUT_META[cut.method] || { label: cut.method, icon: FileText, color: "text-text-primary" };
            const Icon = meta.icon;
            return (
              <div key={cut.method} className="bg-bg-panel rounded-xl border border-bg-active p-4 hover:border-mauve/20 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-bg-active flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{meta.label}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">{cut.count} transacciones</div>
                  </div>
                </div>

                <div className="text-2xl font-bold text-text-primary mb-3">${cut.total.toFixed(2)}</div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Comisión ~3%</span>
                    <span className="font-mono text-text-dim">-${(cut.total * 0.03).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-bg-active/30">
                    <span className="text-text-muted font-medium">Neto estimado</span>
                    <span className="font-mono font-bold text-green">${(cut.total * 0.97).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {cuts.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-text-dim">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-sm">No hay transacciones electrónicas en esta fecha</span>
            </div>
          )}
        </div>
      )}

      {/* Total summary */}
      {cuts.length > 0 && (
        <div className="bg-bg-panel rounded-xl border border-bg-active p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Total corte</div>
              <div className="text-lg font-bold text-text-primary">${totalCuts.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Transacciones</div>
              <div className="text-lg font-bold text-text-primary">{totalCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Comisión total (~3%)</div>
              <div className="text-lg font-bold text-red">-${(totalCuts * 0.03).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Neto total</div>
              <div className="text-lg font-bold text-green">${(totalCuts * 0.97).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
