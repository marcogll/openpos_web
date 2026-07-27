import React from "react";
import {
  Plus,
  Trash2,
  Save,
  Search,
  X,
  AlertCircle,
  Upload,
  Download,
  Check,
  Undo2,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { CsvProductImport } from "../settings/CsvProductImport";

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
  barcode: string | null;
};

type EditableCell = {
  row: number;
  col: string;
};

const UNIT_TYPES = ["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"];

function normalize(p: any): Product {
  return {
    id: Number(p.id ?? 0),
    sku: p.sku || "",
    name: p.name || "",
    price: Number(p.price ?? 0),
    cost: p.cost === null || p.cost === undefined ? null : Number(p.cost),
    category: p.category || "GEN",
    stock: Number(p.stock ?? 0),
    minStock: p.minStock ?? p.min_stock ?? null,
    unitType: p.unitType || p.unit_type || "pza",
    barcode: p.barcode || null,
  };
}

export function ProductBulkEditor() {
  const addToast = useUIStore((s) => s.addToast);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [original, setOriginal] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [editing, setEditing] = React.useState<EditableCell | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [newRow, setNewRow] = React.useState(false);

  const fetchProducts = () => {
    setLoading(true);
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        const mapped = list.map(normalize);
        setProducts(mapped);
        setOriginal(JSON.parse(JSON.stringify(mapped)));
      })
      .catch(() => addToast("Error al cargar productos", "error"))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p) => {
    const t = search.toLowerCase();
    return !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t) || p.category.toLowerCase().includes(t);
  });

  const hasChanges = JSON.stringify(products) !== JSON.stringify(original);

  const updateCell = (rowIdx: number, col: keyof Product, val: any) => {
    setProducts((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: val };
      return next;
    });
  };

  const startEdit = (row: number, col: string, currentVal: string) => {
    setEditing({ row, col });
    setEditValue(currentVal);
  };

  const commitEdit = () => {
    if (!editing) return;
    const { row, col } = editing;
    const p = products[row];
    if (!p) { setEditing(null); return; }

    let val: any = editValue;
    if (col === "price" || col === "cost") val = editValue === "" ? null : parseFloat(editValue);
    else if (col === "stock" || col === "minStock") val = editValue === "" ? null : parseInt(editValue) || 0;
    else if (col === "barcode") val = editValue || null;

    if (col === "sku" && !val) { addToast("SKU no puede estar vacío", "error"); setEditing(null); return; }
    if (col === "name" && !val) { addToast("Nombre no puede estar vacío", "error"); setEditing(null); return; }
    if ((col === "price" || col === "cost") && val !== null && (isNaN(val) || val < 0)) {
      addToast("Valor inválido", "error"); setEditing(null); return;
    }

    updateCell(row, col as keyof Product, val);
    setEditing(null);
  };

  const addRow = () => {
    const maxId = Math.max(...products.map((p) => p.id), 0);
    setProducts((prev) => [
      ...prev,
      { id: maxId + 1, sku: "", name: "", price: 0, cost: null, category: "GEN", stock: 0, minStock: 5, unitType: "pza", barcode: null },
    ]);
  };

  const deleteSelected = () => {
    const toDelete = products.filter((p) => selected.has(p.id));
    if (toDelete.length === 0) return;
    let i = 0;
    for (const p of toDelete) {
      if (!p.sku) {
        setProducts((prev) => prev.filter((x) => x.id !== p.id));
        i++;
        continue;
      }
      fetch(`/api/products/${encodeURIComponent(p.sku)}`, { method: "DELETE" })
        .then((r) => {
          if (r.ok) {
            setProducts((prev) => prev.filter((x) => x.id !== p.id));
            i++;
            if (i === toDelete.length) {
              addToast(`${toDelete.length} producto(s) eliminados`, "success");
              setSelected(new Set());
            }
          }
        })
        .catch(() => addToast(`Error al eliminar ${p.sku}`, "error"));
    }
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = products.filter((p, i) => {
      const orig = original[i];
      return !orig || JSON.stringify(p) !== JSON.stringify(orig);
    });

    let ok = 0;
    let fail = 0;
    for (const p of changed) {
      const orig = original.find((o) => o.id === p.id);
      const isNew = !p.sku || !orig;
      try {
        if (isNew && p.sku) {
          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
          if (res.ok || res.status === 201) ok++;
          else fail++;
        } else if (orig) {
          const body: Record<string, any> = {};
          if (p.name !== orig.name) body.name = p.name;
          if (p.price !== orig.price) body.price = p.price;
          if (p.cost !== orig.cost) body.cost = p.cost;
          if (p.category !== orig.category) body.category = p.category;
          if (p.stock !== orig.stock) body.stock = p.stock;
          if (p.minStock !== orig.minStock) body.minStock = p.minStock;
          if (p.unitType !== orig.unitType) body.unitType = p.unitType;
          if (p.barcode !== orig.barcode) body.barcode = p.barcode;
          if (Object.keys(body).length === 0) { ok++; continue; }
          const res = await fetch(`/api/products/${encodeURIComponent(p.sku)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) ok++;
          else fail++;
        }
      } catch { fail++; }
    }

    addToast(`${ok} guardados${fail ? `, ${fail} errores` : ""}`, fail ? "error" : "success");
    fetchProducts();
    setSaving(false);
  };

  const discardChanges = () => {
    setProducts(JSON.parse(JSON.stringify(original)));
    setEditing(null);
    addToast("Cambios descartados", "info");
  };

  const exportCsv = () => {
    const headers = ["sku", "name", "category", "price", "cost", "stock", "minStock", "unitType", "barcode"];
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...products.map((p) => headers.map((h) => escape((p as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allSelected = products.length > 0 && selected.size === products.length;

  const colWidths: Record<string, string> = {
    sel: "w-8",
    sku: "w-24",
    name: "min-w-40 flex-1",
    category: "w-20",
    price: "w-20",
    cost: "w-20",
    stock: "w-16",
    minStock: "w-16",
    unitType: "w-20",
    barcode: "w-28",
  };

  const renderCell = (p: Product, rowIdx: number, col: string, label: string, type: string = "text") => {
    const val = (p as any)[col];
    const isEditing = editing?.row === rowIdx && editing?.col === col;
    const display = val === null || val === undefined ? "" : String(val);

    if (col === "unitType") {
      return (
        <td key={col} className={`${colWidths[col]} px-2 py-1.5 text-xs`}>
          {isEditing ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              autoFocus
              className="w-full px-1 py-0.5 rounded bg-bg border border-mauve/50 text-xs text-text-secondary outline-none"
            >
              {UNIT_TYPES.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          ) : (
            <span onClick={() => startEdit(rowIdx, col, display)} className="cursor-pointer hover:bg-bg-active/50 px-1 -mx-1 rounded block">
              {display || <span className="text-text-dim">—</span>}
            </span>
          )}
        </td>
      );
    }

    return (
      <td key={col} className={`${colWidths[col]} px-2 py-1.5 text-xs`}>
        {isEditing ? (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(type === "number" ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
            autoFocus
            className="w-full px-1 py-0.5 rounded bg-bg border border-mauve/50 text-xs text-text-secondary outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit(rowIdx, col, display)}
            className={`cursor-pointer hover:bg-bg-active/50 px-1 -mx-1 rounded block truncate ${
              (col === "price" || col === "cost") ? "text-right font-mono" :
              col === "stock" || col === "minStock" ? "text-right" :
              col === "category" ? "font-mono uppercase" :
              col === "sku" ? "font-mono text-text-muted" : ""
            } ${col === "name" ? "font-medium text-text-primary" : "text-text-secondary"}`}
          >
            {col === "price" || col === "cost" ? (val !== null && val !== undefined ? `$${Number(val).toFixed(2)}` : "—") :
             col === "stock" || col === "minStock" ? (val !== null && val !== undefined ? String(val) : "—") :
             display || <span className="text-text-dim">—</span>}
          </span>
        )}
      </td>
    );
  };

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap bg-bg-panel rounded-xl border border-bg-active px-4 py-3">
        <div className="flex items-center gap-1.5 text-text-primary font-bold text-sm mr-2">
          <span className="w-2 h-2 rounded-full bg-mauve" />
          Productos
          <span className="text-text-muted font-normal ml-1">({products.length})</span>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg border border-bg-active text-xs text-text-secondary placeholder:text-text-dim focus:border-mauve/30 focus:ring-1 focus:ring-mauve/10 outline-none"
          />
        </div>

        <div className="flex-1" />

        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all">
          <Upload className="w-3.5 h-3.5" /> Importar
        </button>

        <button onClick={addRow} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-mauve/10 text-mauve text-xs font-semibold hover:bg-mauve/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> Fila
        </button>

        {selected.size > 0 && (
          <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red/10 text-red text-xs font-semibold hover:bg-red/20 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> {selected.size}
          </button>
        )}

        {hasChanges && (
          <>
            <div className="w-px h-6 bg-bg-active" />
            <button onClick={discardChanges} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-bg-active text-text-secondary text-xs font-medium hover:bg-bg-section transition-all">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 h-8 rounded-lg bg-green text-bg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40"
            >
              {saving ? <div className="w-3.5 h-3.5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-bg-panel rounded-xl border border-bg-active">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-bg-active rounded animate-pulse-slow" />)}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-bg-section/95 backdrop-blur text-text-dim text-[10px] uppercase tracking-wider border-b border-bg-active">
                <th className={`${colWidths.sel} px-2 py-2`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)))}
                    className="w-3.5 h-3.5 rounded bg-bg-active border-bg-active text-mauve"
                  />
                </th>
                <th className={`${colWidths.sku} px-2 py-2 text-left font-medium`}>SKU</th>
                <th className={`${colWidths.name} px-2 py-2 text-left font-medium`}>Nombre</th>
                <th className={`${colWidths.category} px-2 py-2 text-left font-medium`}>Cat</th>
                <th className={`${colWidths.price} px-2 py-2 text-right font-medium`}>Precio</th>
                <th className={`${colWidths.cost} px-2 py-2 text-right font-medium`}>Costo</th>
                <th className={`${colWidths.stock} px-2 py-2 text-right font-medium`}>Stock</th>
                <th className={`${colWidths.minStock} px-2 py-2 text-right font-medium`}>Min</th>
                <th className={`${colWidths.unitType} px-2 py-2 text-left font-medium`}>Unidad</th>
                <th className={`${colWidths.barcode} px-2 py-2 text-left font-medium`}>Código</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const rowIdx = products.indexOf(p);
                const cat = p.category.toUpperCase();
                const isService = cat === "SER" || p.unitType === "servicio";
                const lowStock = !isService && p.stock <= (p.minStock ?? 0);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-bg-active/30 hover:bg-bg-active/20 transition-colors ${
                      selected.has(p.id) ? "bg-mauve/5" : ""
                    } ${!p.sku ? "bg-amber/5" : ""}`}
                  >
                    <td className={`${colWidths.sel} px-2 py-1.5`}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => setSelected((prev) => { const next = new Set(prev); next.has(p.id) ? next.delete(p.id) : next.add(p.id); return next; })}
                        className="w-3.5 h-3.5 rounded bg-bg-active border-bg-active text-mauve"
                      />
                    </td>
                    {renderCell(p, rowIdx, "sku", "SKU")}
                    {renderCell(p, rowIdx, "name", "Nombre")}
                    {renderCell(p, rowIdx, "category", "Cat")}
                    {renderCell(p, rowIdx, "price", "Precio", "number")}
                    {renderCell(p, rowIdx, "cost", "Costo", "number")}
                    {renderCell(p, rowIdx, "stock", "Stock", "number")}
                    {renderCell(p, rowIdx, "minStock", "Min", "number")}
                    {renderCell(p, rowIdx, "unitType", "Unidad")}
                    {renderCell(p, rowIdx, "barcode", "Código")}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-text-dim text-sm">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
        <span>{filtered.length} de {products.length} productos {hasChanges ? `· ${products.filter((p,i) => JSON.stringify(p) !== JSON.stringify(original[i])).length} cambios` : ""}</span>
        <span>Click en celda para editar · Enter confirma · ESC cancela</span>
      </div>

      {showImport && <CsvProductImport onClose={() => { setShowImport(false); fetchProducts(); }} />}
    </div>
  );
}
