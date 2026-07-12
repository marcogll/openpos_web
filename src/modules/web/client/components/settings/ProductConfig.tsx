import React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  X,
  AlertCircle,
  Upload,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { CsvProductImport } from "./CsvProductImport";

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

type ProductForm = Omit<Product, "id">;

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  price: 0,
  cost: null,
  category: "",
  stock: 0,
  minStock: null,
  unitType: "pza",
  barcode: null,
};

const UNIT_TYPES = ["pza", "kg", "g", "lt", "ml", "m", "cm", "servicio"];

export function ProductConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Product | null>(null);
  const [showImport, setShowImport] = React.useState(false);

  const fetchProducts = () => {
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((data) => setProducts(data.items || data))
      .catch(() => addToast("Error al cargar productos", "error"))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      price: p.price,
      cost: p.cost,
      category: p.category,
      stock: p.stock,
      minStock: p.minStock,
      unitType: p.unitType,
      barcode: p.barcode,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/products/${encodeURIComponent(editing.sku)}` : "/api/products";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editing ? "Producto actualizado" : "Producto creado", "success");
        setShowModal(false);
        fetchProducts();
      } else {
        addToast("Error al guardar producto", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.sku)}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Producto eliminado", "success");
        fetchProducts();
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const set = (key: keyof ProductForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-mauve" />
          <h3 className="text-base font-bold text-text-primary">Productos</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section hover:text-text-primary transition-all"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar
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
            placeholder="Buscar por nombre, SKU o categoría..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-22rem)]">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">SKU</th>
                <th className="text-left px-6 py-3 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 font-medium">Categoría</th>
                <th className="text-right px-6 py-3 font-medium">Precio</th>
                <th className="text-right px-6 py-3 font-medium">Stock</th>
                <th className="text-right px-6 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                >
                  <td className="px-6 py-3 font-mono text-text-muted text-xs">
                    {p.sku}
                  </td>
                  <td className="px-6 py-3 text-text-primary font-medium">
                    {p.name}
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{p.category}</td>
                  <td className="px-6 py-3 text-right text-green font-bold">
                    ${Number(p.price).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {p.category.toUpperCase() === "SER" || p.unitType.toLowerCase() === "servicio" ? (
                      <span className="font-medium text-pink">Servicio</span>
                    ) : (
                      <span
                        className={`font-medium ${
                          p.stock <= (p.minStock || 0) ? "text-red" : "text-text-secondary"
                        }`}
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-blue hover:bg-blue/10 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-red hover:bg-red/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-dim">
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel rounded-2xl border border-bg-active w-[540px] max-h-[90vh] overflow-auto animate-scale-in shadow-2xl">
            <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editing ? "Editar Producto" : "Nuevo Producto"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-dim hover:text-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    SKU
                  </label>
                  <input
                    value={form.sku}
                    onChange={(e) => set("sku", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Código de barras
                  </label>
                  <input
                    value={form.barcode || ""}
                    onChange={(e) => set("barcode", e.target.value || null)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Nombre
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Precio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost ?? ""}
                    onChange={(e) =>
                      set("cost", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Categoría
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Unidad
                  </label>
                  <select
                    value={form.unitType}
                    onChange={(e) => set("unitType", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-green/50 focus:ring-1 focus:ring-green/20 transition-all appearance-none"
                  >
                    {UNIT_TYPES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Stock actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => set("stock", parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock ?? ""}
                    onChange={(e) =>
                      set("minStock", e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-bg-active flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.sku || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green text-bg font-semibold text-sm hover:bg-green-bright transition-all disabled:opacity-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                {editing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel rounded-2xl border border-bg-active w-[400px] animate-scale-in shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Eliminar producto</h3>
                <p className="text-sm text-text-muted">
                  ¿Eliminar <strong className="text-text-secondary">{deleteConfirm.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2.5 rounded-lg bg-red text-white text-sm font-semibold hover:opacity-90 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <CsvProductImport onClose={() => { setShowImport(false); fetchProducts(); }} />
      )}
    </div>
  );
}
