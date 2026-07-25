import React from "react";
import { ClipboardList, ChevronRight, ChevronLeft, Check, Search, Package } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unitType: string;
};

type CountItem = {
  sku: string;
  name: string;
  currentStock: number;
  counted: string;
};

const CATEGORIES = [
  { code: "ALL", label: "Todos" },
  { code: "MAQ", label: "Maquillaje" },
  { code: "CFA", label: "Cuidado Facial" },
  { code: "CAB", label: "Cabello" },
  { code: "UNA", label: "Uñas" },
  { code: "SPA", label: "Spa/Tratamientos" },
  { code: "HER", label: "Herramientas" },
  { code: "ACC", label: "Accesorios" },
];

type Step = "category" | "count" | "review";

export function PhysicalCount() {
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = React.useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [items, setItems] = React.useState<CountItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const loadProducts = async (category: string) => {
    setLoading(true);
    try {
      const q = category === "ALL" ? "" : category;
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=500`);
      const data = await res.json();
      const all: Product[] = data.items || [];
      const filtered = category === "ALL" ? all : all.filter((p) => p.category === category);
      setProducts(filtered);
      setItems(
        filtered.map((p) => ({
          sku: p.sku,
          name: p.name,
          currentStock: p.stock,
          counted: String(p.stock),
        }))
      );
      setStep("count");
    } catch {
      addToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateCounted = (sku: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, counted: value } : item))
    );
  };

  const differences = items.filter((item) => {
    const counted = parseInt(item.counted, 10);
    return !isNaN(counted) && counted !== item.currentStock;
  });

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const toSubmit = differences.map((d) => ({
      sku: d.sku,
      countedStock: parseInt(d.counted, 10) || 0,
    }));

    if (toSubmit.length === 0) {
      addToast("No hay diferencias para ajustar", "info");
      setStep("category");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/inventory/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toSubmit, note: "Inventario físico" }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(
          `Inventario ajustado: ${data.adjusted} productos corregidos`,
          "success"
        );
        setStep("category");
        setItems([]);
        setProducts([]);
      } else {
        addToast(data.error || "Error al procesar conteo", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Inventario Físico</h3>
            <p className="text-xs text-text-dim">Wizard de conteo por categoría</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {(["category", "count", "review"] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s
                      ? "bg-amber text-bg"
                      : i < ["category", "count", "review"].indexOf(step)
                      ? "bg-amber/20 text-amber"
                      : "bg-bg-active text-text-dim"
                  }`}
                >
                  {i < ["category", "count", "review"].indexOf(step) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    step === s ? "text-text-primary" : "text-text-dim"
                  }`}
                >
                  {s === "category" ? "Categoría" : s === "count" ? "Conteo" : "Revisar"}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-bg-active mx-2" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Step 1: Category selection */}
        {step === "category" && (
          <div className="max-w-md mx-auto animate-fade-in">
            <p className="text-sm text-text-secondary mb-6 text-center">
              Selecciona la categoría para el conteo físico
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => {
                    setSelectedCategory(cat.code);
                    loadProducts(cat.code);
                  }}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 rounded-xl border border-bg-active bg-bg hover:border-amber/50 hover:bg-amber/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-bg-active group-hover:bg-amber/10 flex items-center justify-center transition-colors">
                    <Package className="w-4.5 h-4.5 text-text-dim group-hover:text-amber transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{cat.label}</p>
                    <p className="text-[10px] text-text-dim">{cat.code === "ALL" ? "Todas las categorías" : cat.code}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-dim ml-auto group-hover:text-amber transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Count */}
        {step === "count" && (
          <div className="animate-fade-in">
            {/* Search + controls */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar productos..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-all"
                />
              </div>
              <span className="text-xs text-text-dim whitespace-nowrap">
                {differences.length} diferencias
              </span>
            </div>

            {/* Table */}
            <div className="bg-bg rounded-lg border border-bg-active overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">SKU</th>
                    <th className="text-left px-4 py-2.5 font-medium">Producto</th>
                    <th className="text-right px-4 py-2.5 font-medium">Sistema</th>
                    <th className="text-right px-4 py-2.5 font-medium w-32">Contado</th>
                    <th className="text-right px-4 py-2.5 font-medium w-24">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const counted = parseInt(item.counted, 10);
                    const diff = !isNaN(counted) ? counted - item.currentStock : 0;
                    const hasDiff = counted !== item.currentStock && !isNaN(counted);
                    return (
                      <tr
                        key={item.sku}
                        className={`border-b border-bg-active/50 transition-colors ${
                          hasDiff ? "bg-amber/5" : "hover:bg-bg-active/30"
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-text-muted text-xs">{item.sku}</td>
                        <td className="px-4 py-2.5 text-text-primary font-medium">{item.name}</td>
                        <td className="px-4 py-2.5 text-right text-text-secondary font-mono">
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.counted}
                            onChange={(e) => updateCounted(item.sku, e.target.value)}
                            className={`w-20 h-8 px-2 rounded-lg bg-bg-active/50 border text-sm text-right font-bold transition-all outline-none ${
                              hasDiff
                                ? "border-amber/50 text-amber"
                                : "border-transparent text-text-secondary focus:border-amber/30"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {hasDiff && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                diff > 0 ? "bg-green/10 text-green" : "bg-red/10 text-red"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  setStep("category");
                  setItems([]);
                }}
                className="flex items-center gap-2 px-4 h-10 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                onClick={() => setStep("review")}
                disabled={differences.length === 0}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-amber text-bg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
                Revisar {differences.length > 0 && `(${differences.length})`}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="max-w-lg mx-auto animate-fade-in">
            <p className="text-sm text-text-secondary mb-6 text-center">
              Revisa las diferencias antes de aplicar el conteo
            </p>

            {differences.length === 0 ? (
              <div className="text-center py-8">
                <Check className="w-12 h-12 text-green mx-auto mb-3" />
                <p className="text-sm font-medium text-text-secondary">
                  No hay diferencias — el inventario está correcto
                </p>
              </div>
            ) : (
              <div className="bg-bg rounded-xl border border-bg-active overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-medium">Producto</th>
                      <th className="text-right px-4 py-2.5 font-medium">Sistema</th>
                      <th className="text-right px-4 py-2.5 font-medium">Contado</th>
                      <th className="text-right px-4 py-2.5 font-medium">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.map((d) => {
                      const counted = parseInt(d.counted, 10) || 0;
                      const diff = counted - d.currentStock;
                      return (
                        <tr key={d.sku} className="border-b border-bg-active/50">
                          <td className="px-4 py-2.5 text-text-primary font-medium">{d.name}</td>
                          <td className="px-4 py-2.5 text-right text-text-dim font-mono">{d.currentStock}</td>
                          <td className="px-4 py-2.5 text-right text-text-secondary font-mono font-bold">{counted}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`font-bold ${diff > 0 ? "text-green" : "text-red"}`}
                            >
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("count")}
                className="flex items-center gap-2 px-4 h-10 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || differences.length === 0}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-amber text-bg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Aplicar Inventario ({differences.length} ajustes)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
