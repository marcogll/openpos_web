import React from "react";

type AuditEntry = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: string | null;
  performed_by: string;
  ip_address: string | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  deactivate: "Desactivación",
  sell: "Venta",
  adjust_stock: "Ajuste Stock",
  physical_count: "Conteo Físico",
  entry: "Entrada",
  login: "Inicio Sesión",
  setup: "Config. Inicial",
};

const ENTITY_LABELS: Record<string, string> = {
  product: "Producto",
  sale: "Venta",
  user: "Usuario",
  client: "Cliente",
  config: "Configuración",
  inventory: "Inventario",
  auth: "Autenticación",
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-green",
  sell: "text-green",
  entry: "text-green",
  update: "text-blue",
  login: "text-blue",
  adjust_stock: "text-amber",
  physical_count: "text-amber",
  delete: "text-red",
  deactivate: "text-red",
  setup: "text-mauve",
};

export function AuditLogView() {
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState("");
  const [filterAction, setFilterAction] = React.useState("");
  const [filterUser, setFilterUser] = React.useState("");
  const LIMIT = 50;

  const fetchLog = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (filterType) params.set("entity_type", filterType);
      if (filterAction) params.set("action", filterAction);
      if (filterUser) params.set("performed_by", filterUser);
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      setEntries(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [offset, filterType, filterAction, filterUser]);

  React.useEffect(() => { fetchLog(); }, [fetchLog]);

  const exportCsv = () => {
    const params = new URLSearchParams({ limit: "5000", format: "csv" });
    if (filterType) params.set("entity_type", filterType);
    if (filterAction) params.set("action", filterAction);
    if (filterUser) params.set("performed_by", filterUser);
    window.open(`/api/audit?${params}`, "_blank");
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setOffset(0); }}
          className="px-3 py-1.5 rounded-lg bg-bg-panel border border-bg-active text-sm text-text-secondary"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setOffset(0); }}
          className="px-3 py-1.5 rounded-lg bg-bg-panel border border-bg-active text-sm text-text-secondary"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filtrar por usuario..."
          value={filterUser}
          onChange={e => { setFilterUser(e.target.value); setOffset(0); }}
          className="px-3 py-1.5 rounded-lg bg-bg-panel border border-bg-active text-sm text-text-secondary w-48"
        />
        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg bg-bg-active text-text-secondary text-sm hover:bg-bg-hover transition-colors ml-auto"
        >
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted">Cargando...</div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted">Sin registros</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted border-b border-bg-active">
                <th className="text-left py-2 px-2 font-medium">Fecha</th>
                <th className="text-left py-2 px-2 font-medium">Entidad</th>
                <th className="text-left py-2 px-2 font-medium">ID</th>
                <th className="text-left py-2 px-2 font-medium">Acción</th>
                <th className="text-left py-2 px-2 font-medium">Usuario</th>
                <th className="text-left py-2 px-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-bg-active/50 hover:bg-bg-active/30">
                  <td className="py-1.5 px-2 text-text-secondary text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary">
                    {ENTITY_LABELS[e.entity_type] || e.entity_type}
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary font-mono text-xs">{e.entity_id}</td>
                  <td className="py-1.5 px-2">
                    <span className={`${ACTION_COLORS[e.action] || "text-text-secondary"} font-medium`}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary">{e.performed_by}</td>
                  <td className="py-1.5 px-2 text-text-muted text-xs">{e.ip_address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>{total} registros</span>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
            disabled={offset === 0}
            className="px-3 py-1 rounded-lg bg-bg-panel border border-bg-active disabled:opacity-30 hover:bg-bg-active transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => setOffset(o => o + LIMIT)}
            disabled={offset + LIMIT >= total}
            className="px-3 py-1 rounded-lg bg-bg-panel border border-bg-active disabled:opacity-30 hover:bg-bg-active transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
