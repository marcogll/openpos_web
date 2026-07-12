import React from "react";
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  Ticket,
  Download,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type ParsedTicket = {
  ticket: string;
  createdAt: string;
  method: string;
  items: { sku: string; name: string; qty: number; price: number }[];
  total: number;
  subtotal: number;
  tax: number;
  createdBy: string;
  _errors: string[];
};

type ImportResult = {
  imported: number;
  rejected: number;
  errors: { ticket: string; reason: string }[];
  importedTickets: string[];
};

const VALID_METHODS = ["efectivo", "tarjeta", "transf.", "qr/codi", "otro"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const values = line.split(",").map((v) => v.trim());
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function groupByTicket(rows: Record<string, string>[]): ParsedTicket[] {
  const ticketMap = new Map<string, { row: Record<string, string>; lineNum: number }[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const ticket = row.ticket?.trim() || "";
    if (!ticketMap.has(ticket)) {
      ticketMap.set(ticket, []);
    }
    ticketMap.get(ticket)!.push({ row, lineNum: i + 2 });
  }

  const tickets: ParsedTicket[] = [];

  for (const [ticket, entries] of ticketMap) {
    const firstRow = entries[0]!.row;
    const errors: string[] = [];

    // Validate ticket
    if (!ticket) errors.push("Ticket vacío");

    // Validate date
    const createdAt = firstRow.createdat?.trim() || "";
    if (!createdAt || isNaN(Date.parse(createdAt))) {
      errors.push("Fecha inválida");
    }

    // Validate method
    const method = firstRow.method?.trim().toLowerCase() || "";
    if (!VALID_METHODS.includes(method)) {
      errors.push(`Método inválido: ${firstRow.method}`);
    }

    // Parse items
    const items: ParsedTicket["items"] = [];
    let totalFromRows = 0;

    for (const { row, lineNum } of entries) {
      const qty = parseFloat(row.qty) || 0;
      const price = parseFloat(row.price) || 0;

      if (qty <= 0) errors.push(`Línea ${lineNum}: cantidad inválida`);
      if (price < 0) errors.push(`Línea ${lineNum}: precio inválido`);

      items.push({
        sku: row.sku?.trim() || "",
        name: row.name?.trim() || "",
        qty,
        price,
      });

      totalFromRows += price * qty;
    }

    // Validate totals
    const total = parseFloat(firstRow.total) || totalFromRows;
    if (total < 0) errors.push("Total inválido");

    tickets.push({
      ticket,
      createdAt,
      method,
      items,
      total,
      subtotal: parseFloat(firstRow.subtotal) || totalFromRows,
      tax: parseFloat(firstRow.tax) || 0,
      createdBy: firstRow.createdby?.trim() || "import",
      _errors: errors,
    });
  }

  return tickets;
}

export function CsvSalesImport({ onClose }: { onClose: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = React.useState<"select" | "preview" | "result">("select");
  const [tickets, setTickets] = React.useState<ParsedTicket[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const validTickets = tickets.filter((t) => t._errors.length === 0);
  const errorTickets = tickets.filter((t) => t._errors.length > 0);

  const totalAmount = validTickets.reduce((s, t) => s + t.total, 0);
  const dateRange =
    validTickets.length > 0
      ? {
          min: validTickets
            .map((t) => t.createdAt)
            .sort()[0],
          max: validTickets
            .map((t) => t.createdAt)
            .sort()
            .reverse()[0],
        }
      : null;

  const downloadTemplate = () => {
    const csv = [
      "ticket,createdAt,method,sku,name,qty,price,subtotal,tax,total,createdBy",
      "0001,2026-06-01T10:30:00,efectivo,SERV-CORTE,Corte de cabello,1,250,250,40,290,Ana",
      "0002,2026-06-01T11:10:00,tarjeta,SERV-BARBA,Barba,1,150,150,24,174,Ana",
      "0002,2026-06-01T11:10:00,tarjeta,PROD-SHAMPOO,Shampoo 250ml,1,180,180,28.8,208.8,Ana",
      "0003,2026-06-02T09:00:00,qr/codi,SERV-CORTE,Corte de cabello,1,250,250,40,290,Carlos",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_ventas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const grouped = groupByTicket(rows);
      setTickets(grouped);
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/import/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickets: validTickets.map((t) => ({
            ticket: t.ticket,
            createdAt: t.createdAt,
            method: t.method,
            items: t.items,
            total: t.total,
            subtotal: t.subtotal,
            tax: t.tax,
            createdBy: t.createdBy,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep("result");
        addToast(`Importadas: ${data.imported} ventas`, "success");
      } else {
        addToast(data.error || "Error al importar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-panel rounded-2xl border border-bg-active w-[640px] max-h-[85vh] overflow-hidden animate-scale-in shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-mauve" />
            <h3 className="text-lg font-bold text-text-primary">
              Importar Historial de Ventas
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === "select" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-bg-active rounded-xl p-8 text-center hover:border-mauve/30 transition-colors">
                <FileText className="w-10 h-10 text-text-dim mx-auto mb-3" />
                <p className="text-sm text-text-secondary mb-1">
                  Selecciona un archivo CSV de ventas
                </p>
                <p className="text-xs text-text-dim mb-4">
                  Múltiples filas con el mismo ticket se agrupan en una venta
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Seleccionar archivo
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-bg-active/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-dim uppercase tracking-wider">
                    Formato esperado
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-mauve hover:text-lavender transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar plantilla
                  </button>
                </div>
                <code className="text-xs text-text-secondary block whitespace-pre-wrap font-mono">
{`ticket,createdAt,method,sku,name,qty,price,subtotal,tax,total,createdBy
0001,2026-06-01T10:30:00,efectivo,SERV-CORTE,Corte de cabello,1,250,250,40,290,Ana
0002,2026-06-01T11:10:00,tarjeta,SERV-BARBA,Barba,1,150,150,24,174,Ana`}
                </code>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green">{validTickets.length}</div>
                  <div className="text-xs text-text-dim">Válidos</div>
                </div>
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red">{errorTickets.length}</div>
                  <div className="text-xs text-text-dim">Con error</div>
                </div>
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-mauve">
                    ${totalAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-dim">Total</div>
                </div>
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue">{tickets.length}</div>
                  <div className="text-xs text-text-dim">Tickets</div>
                </div>
              </div>

              {/* Date range */}
              {dateRange && (
                <div className="bg-bg-active/30 rounded-lg p-3 flex items-center gap-2 text-xs text-text-secondary">
                  <Calendar className="w-3.5 h-3.5 text-mauve" />
                  <span>
                    Rango: {new Date(dateRange.min).toLocaleDateString("es-MX")} —{" "}
                    {new Date(dateRange.max).toLocaleDateString("es-MX")}
                  </span>
                </div>
              )}

              {/* Errors */}
              {errorTickets.length > 0 && (
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 max-h-32 overflow-auto">
                  <p className="text-xs font-medium text-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Tickets con error
                  </p>
                  {errorTickets.map((t) => (
                    <div key={t.ticket} className="text-xs text-text-secondary py-0.5">
                      Ticket {t.ticket}: {t._errors.join(", ")}
                    </div>
                  ))}
                </div>
              )}

              {/* Valid tickets table */}
              {validTickets.length > 0 && (
                <div className="border border-bg-active rounded-lg overflow-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-bg-active/50 text-text-dim uppercase tracking-wider">
                        <th className="text-left px-3 py-2 font-medium">Ticket</th>
                        <th className="text-left px-3 py-2 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2 font-medium">Método</th>
                        <th className="text-right px-3 py-2 font-medium">Items</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validTickets.slice(0, 20).map((t) => (
                        <tr key={t.ticket} className="border-t border-bg-active/50">
                          <td className="px-3 py-2 font-mono text-text-muted">{t.ticket}</td>
                          <td className="px-3 py-2 text-text-secondary">
                            {new Date(t.createdAt).toLocaleDateString("es-MX")}
                          </td>
                          <td className="px-3 py-2 text-text-secondary capitalize">{t.method}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{t.items.length}</td>
                          <td className="px-3 py-2 text-right text-green font-bold">
                            ${t.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validTickets.length > 20 && (
                    <div className="text-center py-2 text-xs text-text-dim border-t border-bg-active/50">
                      ... y {validTickets.length - 20} tickets más
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green/5 border border-green/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green">{result.imported}</div>
                  <div className="text-xs text-text-dim mt-1">Importadas</div>
                </div>
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red">{result.rejected}</div>
                  <div className="text-xs text-text-dim mt-1">Rechazadas</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 max-h-40 overflow-auto">
                  <p className="text-xs font-medium text-red uppercase tracking-wider mb-2">
                    Detalle de rechazos
                  </p>
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-xs text-text-secondary py-0.5">
                      Ticket {e.ticket}: {e.reason}
                    </div>
                  ))}
                </div>
              )}

              {result.importedTickets.length > 0 && (
                <div className="bg-green/5 border border-green/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-green uppercase tracking-wider mb-2">
                    Tickets importados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.importedTickets.map((ticket) => (
                      <span key={ticket} className="px-2 py-0.5 rounded bg-green/10 text-green text-xs font-mono">
                        {ticket}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-bg-active flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
          >
            {step === "result" ? "Cerrar" : "Cancelar"}
          </button>
          {step === "preview" && validTickets.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mauve text-bg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Importar {validTickets.length} ventas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
