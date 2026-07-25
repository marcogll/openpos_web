import React from "react";
import {
  UsersRound,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Star,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Client = {
  id: number;
  code: string;
  rfc: string;
  razonSocial: string;
  email: string;
  telefono: string;
  direccion: string;
  regimenFiscal: string;
  puntos: number;
  createdAt: string;
};

type ClientForm = {
  rfc: string;
  razonSocial: string;
  email: string;
  telefono: string;
  direccion: string;
  regimenFiscal: string;
};

type Sale = {
  id: number;
  ticket: string;
  total: number;
  method: string;
  items: string;
  createdAt: string;
};

const EMPTY_FORM: ClientForm = {
  rfc: "",
  razonSocial: "",
  email: "",
  telefono: "",
  direccion: "",
  regimenFiscal: "601",
};

const normalizeClient = (client: any): Client => ({
  id: Number(client.id ?? 0),
  code: client.code || "",
  rfc: client.rfc || "",
  razonSocial: client.razonSocial || client.razon_social || "",
  email: client.email || "",
  telefono: client.telefono || "",
  direccion: client.direccion || "",
  regimenFiscal: client.regimenFiscal || client.regimen_fiscal || "",
  puntos: Number(client.puntos ?? 0),
  createdAt: client.createdAt || client.created_at || "",
});

type Tab = "lista" | "detalle" | "puntos";

export function ClientsView() {
  const addToast = useUIStore((s) => s.addToast);
  const [activeTab, setActiveTab] = React.useState<Tab>("lista");
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [form, setForm] = React.useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [clientSales, setClientSales] = React.useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = React.useState(false);

  const fetchClients = () => {
    setLoading(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        setClients(list.map(normalizeClient));
      })
      .catch(() => addToast("Error al cargar clientes", "error"))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.razonSocial?.toLowerCase().includes(search.toLowerCase()) ||
      c.rfc?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
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
      email: c.email || "",
      telefono: c.telefono || "",
      direccion: c.direccion || "",
      regimenFiscal: c.regimenFiscal || "601",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.rfc || !form.razonSocial) {
      addToast("RFC y Razón Social son obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/clients/${editing.rfc}` : "/api/clients";
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
        const data = await res.json().catch(() => null);
        addToast(data?.error || "Error al guardar cliente", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Client) => {
    try {
      const res = await fetch(`/api/clients/${c.rfc}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Cliente eliminado", "success");
        fetchClients();
        if (selectedClient?.rfc === c.rfc) {
          setSelectedClient(null);
          setActiveTab("lista");
        }
      } else {
        addToast("Error al eliminar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const viewClientDetail = (c: Client) => {
    setSelectedClient(c);
    setActiveTab("detalle");
    fetchClientSales(c.rfc);
  };

  const fetchClientSales = (rfc: string) => {
    setLoadingSales(true);
    fetch("/api/sales?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const allSales = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        const filtered = allSales.filter((s: any) => {
          try {
            return s.customerRfc === rfc || s.customer_rfc === rfc;
          } catch {
            return false;
          }
        });
        setClientSales(filtered);
      })
      .catch(() => setClientSales([]))
      .finally(() => setLoadingSales(false));
  };

  const set = (key: keyof ClientForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const TAB_CLASSES: Record<Tab, { active: string; inactive: string; label: string }> = {
    lista: {
      active: "bg-mauve/15 text-mauve ring-1 ring-mauve/25",
      inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
      label: "Lista de Clientes",
    },
    detalle: {
      active: "bg-blue/15 text-blue ring-1 ring-blue/25",
      inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
      label: "Detalle del Cliente",
    },
    puntos: {
      active: "bg-amber/15 text-amber ring-1 ring-amber/25",
      inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
      label: "Programa de Puntos",
    },
  };

  const renderContent = () => {
    switch (activeTab) {
      case "lista":
        return (
          <ClientList
            clients={filtered}
            loading={loading}
            search={search}
            onSearch={setSearch}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
            onViewDetail={viewClientDetail}
          />
        );
      case "detalle":
        return selectedClient ? (
          <ClientDetail
            client={selectedClient}
            sales={clientSales}
            loadingSales={loadingSales}
            onBack={() => setActiveTab("lista")}
            onEdit={() => openEdit(selectedClient)}
          />
        ) : (
          <EmptyState message="Selecciona un cliente de la lista" onBack={() => setActiveTab("lista")} />
        );
      case "puntos":
        return <PointsView clients={clients} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-bg-panel rounded-xl border border-bg-active p-1">
        {(Object.keys(TAB_CLASSES) as Tab[]).map((tabId) => {
          const tab = TAB_CLASSES[tabId];
          return (
            <button
              key={tabId}
              onClick={() => {
                if (tabId === "detalle" && !selectedClient) return;
                setActiveTab(tabId);
              }}
              disabled={tabId === "detalle" && !selectedClient}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === tabId ? tab.active : tab.inactive
              } ${tabId === "detalle" && !selectedClient ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {tabId === "lista" && <UsersRound className="w-4 h-4 flex-shrink-0" />}
              {tabId === "detalle" && <ShoppingCart className="w-4 h-4 flex-shrink-0" />}
              {tabId === "puntos" && <Star className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">{renderContent()}</div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel rounded-2xl border border-bg-active w-[520px] max-h-[90vh] overflow-auto animate-scale-in shadow-2xl">
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
                    RFC *
                  </label>
                  <input
                    value={form.rfc}
                    onChange={(e) => set("rfc", e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    disabled={!!editing}
                    className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                    Régimen Fiscal
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
                  Razón Social *
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
                  <strong className="text-text-secondary">{deleteConfirm.razonSocial}</strong>?
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

// ── Sub-components ─────────────────────────────────────────────────────────

function ClientList({
  clients,
  loading,
  search,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onViewDetail,
}: {
  clients: Client[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onAdd: () => void;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onViewDetail: (c: Client) => void;
}) {
  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <UsersRound className="w-5 h-5 text-mauve" />
          <h3 className="text-base font-bold text-text-primary">Clientes</h3>
          <span className="text-xs text-text-dim bg-bg-active px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-bg-active/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nombre, RFC, email o código..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
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
                <th className="text-left px-6 py-3 font-medium">Código</th>
                <th className="text-left px-6 py-3 font-medium">RFC</th>
                <th className="text-left px-6 py-3 font-medium">Razón Social</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Teléfono</th>
                <th className="text-right px-6 py-3 font-medium">Puntos</th>
                <th className="text-right px-6 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-bg-active/50 hover:bg-bg-active/30 transition-colors cursor-pointer"
                  onClick={() => onViewDetail(c)}
                >
                  <td className="px-6 py-3 font-mono text-mauve text-xs font-medium">
                    {c.code}
                  </td>
                  <td className="px-6 py-3 font-mono text-text-muted text-xs">
                    {c.rfc}
                  </td>
                  <td className="px-6 py-3 text-text-primary font-medium">
                    {c.razonSocial}
                  </td>
                  <td className="px-6 py-3 text-text-secondary text-xs">
                    {c.email || "—"}
                  </td>
                  <td className="px-6 py-3 text-text-secondary text-xs">
                    {c.telefono || "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-amber font-medium text-xs">
                      <Star className="w-3 h-3" />
                      {c.puntos || 0}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onViewDetail(c)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-mauve hover:bg-mauve/10 transition-all"
                        title="Ver detalle"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-blue hover:bg-blue/10 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(c)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-red hover:bg-red/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-dim">
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ClientDetail({
  client,
  sales,
  loadingSales,
  onBack,
  onEdit,
}: {
  client: Client;
  sales: Sale[];
  loadingSales: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-text-dim hover:text-text-secondary hover:bg-bg-active transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <UsersRound className="w-5 h-5 text-blue" />
          <h3 className="text-base font-bold text-text-primary">{client.razonSocial}</h3>
          <span className="text-xs text-text-dim font-mono">{client.code}</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Client Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <InfoCard label="RFC" value={client.rfc} />
          <InfoCard label="Régimen Fiscal" value={client.regimenFiscal || "—"} />
          <InfoCard label="Puntos" value={String(client.puntos || 0)} highlight />
          <InfoCard label="Email" value={client.email || "—"} />
          <InfoCard label="Teléfono" value={client.telefono || "—"} />
          <InfoCard label="Dirección" value={client.direccion || "—"} />
        </div>

        {/* Sales History */}
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue" />
            Historial de Compras
          </h4>

          {loadingSales ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-bg-active rounded-lg animate-pulse-slow" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-text-dim text-sm">
              No hay compras registradas para este cliente
            </div>
          ) : (
            <div className="border border-bg-active rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Ticket</th>
                    <th className="text-left px-4 py-2 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 font-medium">Método</th>
                    <th className="text-right px-4 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 20).map((s) => (
                    <tr key={s.id} className="border-b border-bg-active/50 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-text-primary text-xs font-medium">
                        {s.ticket}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs">
                        {new Date(s.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary text-xs capitalize">
                        {s.method}
                      </td>
                      <td className="px-4 py-2.5 text-right text-green font-bold text-xs">
                        ${Number(s.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PointsView({ clients }: { clients: Client[] }) {
  const topClients = [...clients]
    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
    .slice(0, 20);

  const totalPuntos = clients.reduce((sum, c) => sum + (c.puntos || 0), 0);
  const clientsWithPoints = clients.filter((c) => (c.puntos || 0) > 0).length;

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-active flex-shrink-0">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber" />
          <h3 className="text-base font-bold text-text-primary">Programa de Puntos</h3>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-bg rounded-xl border border-bg-active p-4 text-center">
            <div className="text-2xl font-bold text-amber">{totalPuntos.toLocaleString()}</div>
            <div className="text-xs text-text-dim mt-1">Puntos Totales</div>
          </div>
          <div className="bg-bg rounded-xl border border-bg-active p-4 text-center">
            <div className="text-2xl font-bold text-mauve">{clientsWithPoints}</div>
            <div className="text-xs text-text-dim mt-1">Clientes con Puntos</div>
          </div>
          <div className="bg-bg rounded-xl border border-bg-active p-4 text-center">
            <div className="text-2xl font-bold text-blue">{clients.length}</div>
            <div className="text-xs text-text-dim mt-1">Total Clientes</div>
          </div>
        </div>

        {/* Top Clients */}
        <h4 className="text-sm font-bold text-text-primary mb-3">Top Clientes por Puntos</h4>
        {topClients.length === 0 ? (
          <div className="text-center py-8 text-text-dim text-sm">
            No hay clientes registrados
          </div>
        ) : (
          <div className="border border-bg-active rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-active text-text-dim text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium">RFC</th>
                  <th className="text-right px-4 py-2 font-medium">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.id} className="border-b border-bg-active/50 last:border-0">
                    <td className="px-4 py-2.5 text-text-dim text-xs font-medium">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5 text-text-primary font-medium text-xs">
                      {c.razonSocial}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-text-muted text-xs">
                      {c.rfc}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 text-amber font-bold text-xs">
                        <Star className="w-3 h-3" />
                        {c.puntos || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-bg rounded-xl border border-bg-active p-4">
      <div className="text-xs text-text-dim uppercase tracking-wider mb-1">{label}</div>
      <div
        className={`text-sm font-medium ${
          highlight ? "text-amber text-lg font-bold" : "text-text-secondary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden h-full flex flex-col items-center justify-center">
      <UsersRound className="w-12 h-12 text-text-dim mb-3" />
      <p className="text-text-dim text-sm mb-4">{message}</p>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la lista
      </button>
    </div>
  );
}
