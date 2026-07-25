import React from "react";
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { getCategoryMeta } from "../pos/categoryMeta";

type ParsedRow = {
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  unitType: string;
  minStock: number;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  _line: number;
  _error?: string;
};

type ImportResult = {
  created: number;
  updated: number;
  rejected: number;
  errors: { line: number; sku: string; reason: string }[];
  createdSkus: string[];
  updatedSkus: string[];
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

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

  return { headers, rows };
}

function validateRow(row: Record<string, string>, lineNum: number): string | null {
  if (!row.sku?.trim()) return "SKU vacío";
  if (!row.name?.trim()) return "Nombre vacío";
  const price = parseFloat(row.price);
  if (isNaN(price) || price < 0) return "Precio inválido";
  return null;
}

function toProductRow(row: Record<string, string>, lineNum: number): ParsedRow {
  return {
    sku: row.sku?.trim() || "",
    name: row.name?.trim() || "",
    category: row.category?.trim() || "GEN",
    price: parseFloat(row.price) || 0,
    cost: parseFloat(row.cost) || 0,
    stock: parseFloat(row.stock) || 0,
    unitType: row.unittype?.trim() || row.unit_type?.trim() || "pza",
    minStock: parseFloat(row.minstock) || parseFloat(row.min_stock) || 5,
    barcode: row.barcode?.trim() || null,
    description: row.description?.trim() || null,
    imageUrl: row.imageurl?.trim() || row.image_url?.trim() || null,
    _line: lineNum,
    _error: validateRow(row, lineNum) || undefined,
  };
}

export function CsvProductImport({ onClose }: { onClose: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = React.useState<"select" | "preview" | "result">("select");
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [updateExisting, setUpdateExisting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  // Category summary
  const categorySummary = validRows.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const downloadTemplate = () => {
    const csv = [
      "sku,name,category,price,cost,stock,unitType,minStock,barcode,description,imageUrl",
      "SERV-CORTE,Corte de cabello,SER,250,0,999,servicio,0,,Corte de cabello profesional para caballero,",
      "SERV-BARBA,Barba,SER,150,0,999,servicio,0,,Diseño y recorte de barba con navaja,",
      "SERV-MANICURE,Manicure express,SER,180,0,999,servicio,0,,Manicure rápido con esmaltado regular,",
      "SERV-PEDICURE,Pedicure spa,SER,350,0,999,servicio,0,,Pedicure completo con exfoliación y masaje,",
      "COS-SHAMPOO,Shampoo hidratante 250ml,COS,180,90,12,pieza,3,,Shampoo para cabello seco con keratina,",
      "COS-CREMA,Crema facial antiedad,COS,450,220,8,pieza,2,,Crema con ácido hialurónico y vitamina C,",
      "COS-ESMALTE,Esmalte gel largo duración,COS,85,35,20,pieza,5,,Esmalte en gel color duradero 15ml,",
      "COS-ACETONA,Acetona sin olor 250ml,COS,65,30,15,pieza,5,,Removedor de esmalte profesional,",
      "BEB-AGUA,Agua natural 500ml,BEB,18,9,48,pieza,10,,Agua purificada botella 500ml,",
      "BEB-CAFE,Café americano,BEB,35,10,999,servicio,0,,Café americano recién hecho,",
      "BEB-REFRESCO,Refresco lata 355ml,BEB,25,12,36,pieza,10,,Refresco de cola lata 355ml,",
      "BOT-CHIPS,Papas fritas Bolsa,BOT,45,22,24,pieza,8,,Papas fritas sabor original 45g,",
      "BOT-CHOCOLATE,Barra de chocolate,BOT,38,18,20,pieza,6,,Chocolate con leche 100g,",
      "GEN-PEINE,Peine profesional,GEN,45,18,10,pieza,3,,Peine de carbón resistente a calor,",
      "GEN-GAFETE,Gafete plástico,GEN,25,10,50,pieza,10,,Gafete con porta tarjetas transparente,",
      "HER-CORTADORA,Máquina cortadora 5 estrellas,HER,1200,600,3,pieza,1,,Cortadora de pelo profesional 5W,",
      "HER-TIJERAS,Tijeras de acero inoxidable,HER,450,220,5,pieza,1,,Tijeras de peluquería 6 pulgadas,",
      "HER-CEPILLO,Cepillo redondo cerámica,HER,280,140,4,pieza,1,,Cepillo de secado cerámica 35mm,",
      "KIT-BASICO,Kit cortes básicos,KIT,850,450,2,pieza,1,,Incluye: tijeras, peine, clips y navaja,",
      "KIT-MANICURE,Kit manicure completo,KIT,650,320,2,pieza,1,,Incluye: limas, cutícula, esmaltes y bolsa,",
      "MAT-CURSO,Curso de barbería nivel 1,MAT,2500,0,999,servicio,0,,Curso presencial 40 horas con certificado,",
      "MAT-VIDEO,Video tutorial técnicas avanzadas,MAT,150,0,999,servicio,0,,Acceso online por 6 meses a 50+ videos,",
      "UNA-GEL,Gel semipermanente 10ml,UNA,120,55,15,pieza,5,,Gel soak off color intenso 10ml,",
      "UNA-BASE,Base coat protectora 15ml,UNA,95,42,12,pieza,4,,Base previa al esmalte con fortalecedor,",
      "UNG-LOCION,Loción corporal hidratante,UNG,220,110,8,pieza,3,,Loción con aloe vera y vitamina E 400ml,",
      "UNG-BALSAMO,Bálsamo labial reparador,UNG,85,40,15,pieza,5,,Bálsamo con manteca de karité y miel,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows: parsed } = parseCSV(text);
      const mapped = parsed.map((r, i) => toProductRow(r, i + 2));
      setRows(mapped);
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            sku: r.sku,
            name: r.name,
            category: r.category,
            price: r.price,
            cost: r.cost,
            stock: r.stock,
            unitType: r.unitType,
            minStock: r.minStock,
            barcode: r.barcode,
            description: r.description,
            imageUrl: r.imageUrl,
          })),
          updateExisting,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep("result");
        addToast(
          `Importados: ${data.created} creados, ${data.updated} actualizados`,
          "success"
        );
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
              Importar Productos CSV
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
                  Selecciona un archivo CSV
                </p>
                <p className="text-xs text-text-dim mb-4">
                  Formato: sku, name, category, price, cost, stock, unitType, minStock, barcode, description, imageUrl
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
{`sku,name,category,price,cost,stock,unitType,minStock,barcode,description,imageUrl
SERV-CORTE,Corte de cabello,SER,250,0,999,servicio,0,,Corte profesional,
COS-SHAMPOO,Shampoo 250ml,COS,180,90,12,pieza,3,7501234567890,Shampoo hidratante,
BEB-AGUA,Agua 500ml,BEB,18,9,48,pieza,10,,Agua purificada,
HER-TIJERAS,Tijeras acero,HER,450,220,5,pieza,1,,Tijeras 6 pulgadas,
UNA-GEL,Gel semipermanente,UNA,120,55,15,pieza,5,,Gel soak off 10ml`}
                </code>
              </div>

              <div className="bg-bg-active/30 rounded-lg p-4">
                <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2">
                  Categorías disponibles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {["BEB","BOT","COS","GEN","HER","KIT","MAT","SER","UNA","UNG"].map((code) => {
                    const meta = getCategoryMeta(code);
                    return (
                      <div key={code} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${meta.className}`}>
                        <meta.icon className="w-3 h-3" />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green">{validRows.length}</div>
                  <div className="text-xs text-text-dim">Válidas</div>
                </div>
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red">{errorRows.length}</div>
                  <div className="text-xs text-text-dim">Con error</div>
                </div>
                <div className="bg-bg-active/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-mauve">{rows.length}</div>
                  <div className="text-xs text-text-dim">Total filas</div>
                </div>
              </div>

              {/* Category breakdown */}
              {validRows.length > 0 && (
                <div className="bg-bg-active/30 rounded-lg p-4">
                  <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2">
                    Por categoría
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categorySummary).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="px-2.5 py-1 rounded-full bg-mauve/10 text-mauve text-xs font-medium"
                      >
                        {cat}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {errorRows.length > 0 && (
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 max-h-32 overflow-auto">
                  <p className="text-xs font-medium text-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Errores
                  </p>
                  {errorRows.map((r) => (
                    <div key={r._line} className="text-xs text-text-secondary py-0.5">
                      Línea {r._line}: {r._error} ({r.sku || "sin SKU"})
                    </div>
                  ))}
                </div>
              )}

              {/* Update existing toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 rounded bg-bg-active border-bg-active text-mauve focus:ring-mauve/20"
                />
                <span className="text-sm text-text-secondary">
                  Actualizar productos existentes (mismo SKU)
                </span>
              </label>

              {/* Preview table */}
              {validRows.length > 0 && (
                <div className="border border-bg-active rounded-lg overflow-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-bg-active/50 text-text-dim uppercase tracking-wider">
                        <th className="text-left px-3 py-2 font-medium">SKU</th>
                        <th className="text-left px-3 py-2 font-medium">Nombre</th>
                        <th className="text-left px-3 py-2 font-medium">Cat</th>
                        <th className="text-right px-3 py-2 font-medium">Precio</th>
                        <th className="text-right px-3 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 20).map((r) => (
                        <tr key={r._line} className="border-t border-bg-active/50">
                          <td className="px-3 py-2 font-mono text-text-muted">{r.sku}</td>
                          <td className="px-3 py-2 text-text-primary">{r.name}</td>
                          <td className="px-3 py-2 text-text-secondary">{r.category}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">${r.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{r.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 20 && (
                    <div className="text-center py-2 text-xs text-text-dim border-t border-bg-active/50">
                      ... y {validRows.length - 20} filas más
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green/5 border border-green/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green">{result.created}</div>
                  <div className="text-xs text-text-dim mt-1">Creados</div>
                </div>
                <div className="bg-blue/5 border border-blue/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue">{result.updated}</div>
                  <div className="text-xs text-text-dim mt-1">Actualizados</div>
                </div>
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red">{result.rejected}</div>
                  <div className="text-xs text-text-dim mt-1">Rechazados</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red/5 border border-red/20 rounded-lg p-4 max-h-40 overflow-auto">
                  <p className="text-xs font-medium text-red uppercase tracking-wider mb-2">
                    Detalle de rechazos
                  </p>
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-xs text-text-secondary py-0.5">
                      Línea {e.line} ({e.sku}): {e.reason}
                    </div>
                  ))}
                </div>
              )}

              {result.createdSkus.length > 0 && (
                <div className="bg-green/5 border border-green/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-green uppercase tracking-wider mb-2">
                    SKUs creados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.createdSkus.map((sku) => (
                      <span key={sku} className="px-2 py-0.5 rounded bg-green/10 text-green text-xs font-mono">
                        {sku}
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
          {step === "preview" && validRows.length > 0 && (
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
              Importar {validRows.length} productos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
