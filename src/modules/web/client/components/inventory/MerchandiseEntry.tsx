import React from "react";
import { PackagePlus, Check, X, Package, Plus, Minus } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { BarcodeInput } from "./BarcodeInput";

type Product = {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  category: string;
  stock: number;
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

export function MerchandiseEntry() {
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<Product[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<Product | null>(null);
  const [quantity, setQuantity] = React.useState<string>("1");
  const [cost, setCost] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const searchProducts = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(search)}&limit=20`);
      const data = await res.json();
      setResults(data.items || []);
    } catch {
      addToast("Error al buscar productos", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(barcode)}&limit=5`);
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 1) {
        selectProduct(items[0]);
        addToast(`Producto encontrado: ${items[0].name}`, "success");
      } else if (items.length > 1) {
        setResults(items);
        addToast(`${items.length} productos encontrados`, "info");
      } else {
        addToast("Código de barras no encontrado", "error");
      }
    } catch {
      addToast("Error al buscar por código de barras", "error");
    } finally {
      setSearching(false);
    }
  };

  const selectProduct = (p: Product) => {
    setSelected(p);
    setQuantity("1");
    setCost(p.cost != null ? String(p.cost) : "");
    setNote("");
    setResults([]);
    setSearch("");
  };

  const handleSave = async () => {
    if (!selected) return;
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      addToast("Ingresa una cantidad válida", "error");
      return;
    }

    setSaving(true);
    try {
      const body: any = { sku: selected.sku, quantity: parsedQty, note: note || null };
      if (cost) {
        const parsedCost = parseFloat(cost);
        if (!isNaN(parsedCost) && parsedCost >= 0) {
          body.cost = parsedCost;
        }
      }

      const res = await fetch("/api/inventory/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(
          `Entrada registrada: ${selected.name} +${parsedQty} unidades`,
          "success"
        );
        setSelected(null);
        setQuantity("1");
        setCost("");
        setNote("");
      } else {
        addToast(data.error || "Error al registrar entrada", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const adjustedStock = selected
    ? selected.stock + (parseInt(quantity, 10) || 0)
    : 0;

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center">
          <PackagePlus className="w-5 h-5 text-green" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">Entrada de Mercancía</h3>
          <p className="text-xs text-text-dim">Registra llegada de productos al inventario</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!selected ? (
          <>
            {/* Search bar */}
            <div className="mb-6">
              <BarcodeInput
                value={search}
                onChange={setSearch}
                onBarcodeScan={handleBarcodeScan}
                onSearch={searchProducts}
                autoFocus
              />
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-bg rounded-lg border border-bg-active overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-medium">SKU</th>
                      <th className="text-left px-4 py-2.5 font-medium">Producto</th>
                      <th className="text-left px-4 py-2.5 font-medium">Categoría</th>
                      <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                      <th className="text-right px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-text-muted text-xs">{p.sku}</td>
                        <td className="px-4 py-2.5 text-text-primary font-medium">{p.name}</td>
                        <td className="px-4 py-2.5 text-text-secondary text-xs">
                          {CATEGORY_LABELS[p.category] || p.category}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-text-secondary">{p.stock}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => selectProduct(p)}
                            className="px-3 py-1.5 rounded-lg bg-green/10 text-green text-xs font-medium hover:bg-green/20 transition-all"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {results.length === 0 && !searching && search && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-text-dim mx-auto mb-3" />
                <p className="text-sm text-text-dim">No se encontraron productos</p>
              </div>
            )}

            {results.length === 0 && !search && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-text-dim mx-auto mb-3" />
                <p className="text-sm text-text-dim">Escribe o escanea un código de barras para buscar</p>
              </div>
            )}
          </>
        ) : (
          /* Entry form */
          <div className="max-w-lg mx-auto animate-scale-in">
            {/* Selected product card */}
            <div className="bg-bg rounded-xl border border-bg-active p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-green" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{selected.name}</h4>
                    <p className="text-xs text-text-dim font-mono">{selected.sku}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-text-dim hover:text-text-secondary hover:bg-bg-active transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stock preview */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-bg-active/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Stock Actual</p>
                  <p className="text-xl font-bold text-text-primary">{selected.stock}</p>
                </div>
                <div className="bg-bg-active/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Entrada</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        const val = Math.max(1, (parseInt(quantity, 10) || 1) - 1);
                        setQuantity(String(val));
                      }}
                      className="w-7 h-7 rounded-md bg-bg-active flex items-center justify-center text-text-dim hover:text-text-secondary transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-14 text-center text-xl font-bold bg-transparent border-b-2 border-green/50 focus:border-green text-text-primary outline-none py-0"
                    />
                    <button
                      onClick={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}
                      className="w-7 h-7 rounded-md bg-bg-active flex items-center justify-center text-text-dim hover:text-text-secondary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-bg-active/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Stock Final</p>
                  <p className="text-xl font-bold text-green">{adjustedStock}</p>
                </div>
              </div>

              {/* Cost + Note */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Costo unitario
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 pl-7 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Nota (opcional)
                  </label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Proveedor, factura..."
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 h-11 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !quantity || parseInt(quantity, 10) <= 0}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg bg-green text-bg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Registrar Entrada
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
