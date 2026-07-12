import React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  UsersRound,
  X,
  AlertCircle,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Client = {
  id: number;
  rfc: string;
  razonSocial: string;
  email: string;
  telefono: string;
  direccion: string;
  regimenFiscal: string;
};

type ClientForm = Omit<Client, "id">;

const EMPTY_FORM: ClientForm = {
  rfc: "",
  razonSocial: "",
  email: "",
  telefono: "",
  direccion: "",
  regimenFiscal: "",
};

export function ClientConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [form, setForm] = React.useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Client | null>(null);

  const fetchClients = () => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data.items || data))
      .catch(() => addToast("Error al cargar clientes", "error"))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
      c.rfc.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      rfc: c.rfc,
      razonSocial: c.razonSocial,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      regimenFiscal: c.regimenFiscal,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editing ? "Cliente actualizado" : "Cliente creado", "success");
        setShowModal(false);
        fetchClients();
      } else {
        addToast("Error al guardar cliente", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Client) => {
    try {
      const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Cliente eliminado", "success");
        fetchClients();
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const set = (key: keyof ClientForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="w-5 h-5 text-mauve" />
          <h3 className="text-base font-bold text-text-primary">Clientes</h3>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-bg-active/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RFC o email..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-22rem)]">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">RFC</th>
                <th className="text-left px-6 py-3 font-medium">Razón Social</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Teléfono</th>
                <th className="text-right px-6 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                >
                  <td className="px-6 py-3 font-mono text-text-muted text-xs">
                    {c.rfc}
                  </td>
                  <td className="px-6 py-3 text-text-primary font-medium">
                    {c.razonSocial}
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{c.email}</td>
                  <td className="px-6 py-3 text-text-secondary">{c.telefono}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-blue hover:bg-blue/10 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c)}
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
                  <td colSpan={5} className="px-6 py-12 text-center text-text-dim">
                    No se encontraron clientes
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
          <div className="bg-bg-panel rounded-2xl border border-bg-active w-[500px] max-h-[90vh] overflow-auto animate-scale-in shadow-2xl">
            <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editing ? "Editar Cliente" : "Nuevo Cliente"}
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
                    RFC
                  </label>
                  <input
                    value={form.rfc}
                    onChange={(e) => set("rfc", e.target.value)}
                    placeholder="XAXX010101000"
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Régimen fiscal
                  </label>
                  <input
                    value={form.regimenFiscal}
                    onChange={(e) => set("regimenFiscal", e.target.value)}
                    placeholder="601"
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Razón social
                </label>
                <input
                  value={form.razonSocial}
                  onChange={(e) => set("razonSocial", e.target.value)}
                  placeholder="Nombre completo o razón social"
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Teléfono
                  </label>
                  <input
                    value={form.telefono}
                    onChange={(e) => set("telefono", e.target.value)}
                    placeholder="10 dígitos"
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Dirección
                </label>
                <input
                  value={form.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Calle, número, colonia, ciudad, CP"
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
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
                disabled={saving || !form.rfc || !form.razonSocial}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mauve text-bg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <UsersRound className="w-4 h-4" />
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
                <h3 className="text-base font-bold text-text-primary">Eliminar cliente</h3>
                <p className="text-sm text-text-muted">
                  ¿Eliminar a{" "}
                  <strong className="text-text-secondary">
                    {deleteConfirm.razonSocial}
                  </strong>
                  ?
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
    </div>
  );
}
