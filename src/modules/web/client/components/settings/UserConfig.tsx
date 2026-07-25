import React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  AlertCircle,
  Shield,
  User,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type UserData = {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: "owner-admin" | "admin" | "cashier";
  pinSet: boolean;
};

type UserForm = {
  username: string;
  name: string;
  email: string;
  pin: string;
  role: "owner-admin" | "admin" | "cashier";
};

const EMPTY_FORM: UserForm = {
  username: "",
  name: "",
  email: "",
  pin: "",
  role: "cashier",
};

export function UserConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [users, setUsers] = React.useState<UserData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<UserData | null>(null);
  const [form, setForm] = React.useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<UserData | null>(null);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => addToast("Error al cargar usuarios", "error"))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (u: UserData) => {
    setEditing(u);
    setForm({ username: u.username, name: u.name, email: u.email || "", pin: "", role: u.role });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing && !form.pin ? { ...form, pin: undefined } : form),
      });
      if (res.ok) {
        addToast(editing ? "Usuario actualizado" : "Usuario creado", "success");
        setShowForm(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => null);
        addToast(data?.error || "Error al guardar usuario", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserData) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Usuario eliminado", "success");
        fetchUsers();
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const set = (key: keyof UserForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-mauve" />
          <h3 className="text-base font-bold text-text-primary">Usuarios</h3>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-20rem)]">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-bg-active rounded-lg animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Usuario</th>
                <th className="text-left px-6 py-3 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">PIN</th>
                <th className="text-left px-6 py-3 font-medium">Rol</th>
                <th className="text-right px-6 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors"
                >
                  <td className="px-6 py-3 text-text-primary font-medium">
                    {u.username}
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{u.name}</td>
                  <td className="px-6 py-3 text-text-secondary">{u.email || "—"}</td>
                  <td className="px-6 py-3 font-mono text-text-muted text-xs">
                    {u.pinSet ? "Configurado" : "Sin PIN"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role === "owner-admin" || u.role === "admin"
                          ? "bg-purple/10 text-purple"
                          : "bg-blue/10 text-blue"
                      }`}
                    >
                      {u.role === "owner-admin" || u.role === "admin" ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {u.role === "owner-admin" ? "Owner admin" : u.role === "admin" ? "Administrador" : "Cajero"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-blue hover:bg-blue/10 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-red hover:bg-red/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-dim">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel rounded-2xl border border-bg-active w-[420px] animate-scale-in shadow-2xl">
            <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editing ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-text-dim hover:text-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Usuario
                </label>
                <input
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="Nombre de usuario"
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Nombre completo
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nombre y apellidos"
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="correo@dominio.com"
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  PIN
                </label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) => set("pin", e.target.value)}
                  placeholder="PIN de acceso"
                  maxLength={8}
                  className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Rol
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => set("role", "cashier")}
                    className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                      form.role === "cashier"
                        ? "border-blue/50 bg-blue/10 text-blue"
                        : "border-bg-active text-text-muted hover:bg-bg-active"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Cajero
                  </button>
                  <button
                    type="button"
                    onClick={() => set("role", "admin")}
                    className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                      form.role === "admin"
                        ? "border-purple/50 bg-purple/10 text-purple"
                        : "border-bg-active text-text-muted hover:bg-bg-active"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Administrador
                  </button>
                  <button
                    type="button"
                    onClick={() => set("role", "owner-admin")}
                    className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                      form.role === "owner-admin"
                        ? "border-purple/50 bg-purple/10 text-purple"
                        : "border-bg-active text-text-muted hover:bg-bg-active"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Owner
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-bg-active flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.username || !form.name || (!editing && !form.pin)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mauve text-bg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
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
                <h3 className="text-base font-bold text-text-primary">Eliminar usuario</h3>
                <p className="text-sm text-text-muted">
                  ¿Eliminar a{" "}
                  <strong className="text-text-secondary">{deleteConfirm.name}</strong>?
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
