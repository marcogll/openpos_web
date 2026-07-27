import React from "react";
import {
  Package,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Barcode,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useUIStore } from "../../stores/uiStore";

type KanbanProduct = {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  category: string;
  stock: number;
  min_stock: number | null;
  unit_type: string;
};

type DashboardData = {
  kpis: {
    totalProducts: number;
    totalStockValue: number;
    outOfStock: number;
    belowMinimum: number;
    healthyStock: number;
    excessStock: number;
    movementsWeek: number;
  };
  kanban: {
    out: KanbanProduct[];
    low: KanbanProduct[];
    ok: KanbanProduct[];
    excess: KanbanProduct[];
  };
  categories: { category: string; count: number; totalStock: number }[];
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

const CATEGORY_COLORS: Record<string, string> = {
  MAQ: "#f5c2e7",
  CFA: "#89b4fa",
  CAB: "#fab387",
  UNA: "#f38ba8",
  SPA: "#a6e3a1",
  HER: "#cba6f7",
  ACC: "#94e2d5",
  SER: "#f9e2af",
};

function formatCurrency(v: number) {
  return `$${v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KPICard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30 flex items-center gap-3 min-w-0">
      <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-text-muted text-[10px] uppercase tracking-wider truncate">{label}</p>
        <p className="text-text-primary text-lg font-bold leading-tight">{value}</p>
        {sub && <p className="text-text-dim text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function KanbanCard({ product }: { product: KanbanProduct }) {
  const min = Number(product.min_stock) || 0;
  const stock = Number(product.stock);
  const maxBar = Math.max(min * 3, stock, 1);
  const pct = Math.min((stock / maxBar) * 100, 100);
  const catLabel = CATEGORY_LABELS[product.category] || product.category;

  return (
    <div className="bg-bg-active/40 rounded-lg p-3 border border-bg-active/50 hover:border-bg-active transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-primary truncate leading-tight">{product.name}</p>
          <p className="text-[10px] text-text-dim font-mono mt-0.5">{product.sku}</p>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-section text-text-dim flex-shrink-0">
          {catLabel}
        </span>
      </div>

      {/* Stock bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-dim">Stock</span>
          <span className="text-xs font-bold text-text-primary">{stock}</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor:
                stock === 0
                  ? "#f38ba8"
                  : stock <= min
                  ? "#f9e2af"
                  : "#89b4fa",
            }}
          />
        </div>
        {min > 0 && (
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[9px] text-text-dim">Mín: {min}</span>
            <span className="text-[9px] text-text-dim">
              {formatCurrency(product.price)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  color,
  dotColor,
  products,
  icon: Icon,
}: {
  title: string;
  color: string;
  dotColor: string;
  products: KanbanProduct[];
  icon: React.ElementType;
}) {
  const IconComp = Icon;
  return (
    <div className="flex-1 min-w-[240px] flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <IconComp className="w-3.5 h-3.5 text-text-dim" />
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
          {title}
        </span>
        <span
          className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}
        >
          {products.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-auto space-y-2 px-1 pb-2">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-bg-active">
            <p className="text-[10px] text-text-dim">Sin productos</p>
          </div>
        ) : (
          products.map((p) => <KanbanCard key={p.id} product={p} />)
        )}
      </div>
    </div>
  );
}

const PIE_COLORS = Object.values(CATEGORY_COLORS);

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload?.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[10px] text-text-dim">
            {CATEGORY_LABELS[entry.value] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function InventoryDashboard() {
  const addToast = useUIStore((s) => s.addToast);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/inventory/dashboard")
      .then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Error"); }
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => addToast("Error al cargar dashboard", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-4 animate-fade-in">
        <div className="grid grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-20 bg-bg-panel rounded-xl border border-bg-active animate-pulse-slow" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-panel rounded-xl border border-bg-active animate-pulse-slow" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.kpis) return null;

  const { kpis, kanban, categories } = data;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in overflow-auto pr-1">
      {/* ── KPIs Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-3 flex-shrink-0">
        <KPICard
          icon={<Package className="w-4 h-4 text-text-primary" />}
          label="Total Productos"
          value={kpis.totalProducts}
          color="bg-mauve/20"
        />
        <KPICard
          icon={<DollarSign className="w-4 h-4 text-text-primary" />}
          label="Valor Inventario"
          value={formatCurrency(kpis.totalStockValue)}
          color="bg-green/20"
        />
        <KPICard
          icon={<AlertCircle className="w-4 h-4 text-text-primary" />}
          label="Sin Stock"
          value={kpis.outOfStock}
          color="bg-red/20"
          sub={kpis.outOfStock > 0 ? "Requiere atención" : "Todo bien"}
        />
        <KPICard
          icon={<AlertTriangle className="w-4 h-4 text-text-primary" />}
          label="Bajo Mínimo"
          value={kpis.belowMinimum}
          color="bg-amber/20"
          sub={kpis.belowMinimum > 0 ? "Reabastecer" : "Suficiente"}
        />
        <KPICard
          icon={<CheckCircle className="w-4 h-4 text-text-primary" />}
          label="Stock Saludable"
          value={kpis.healthyStock}
          color="bg-blue/20"
        />
        <KPICard
          icon={<TrendingUp className="w-4 h-4 text-text-primary" />}
          label="Excedidos"
          value={kpis.excessStock}
          color="bg-purple/20"
          sub={kpis.excessStock > 0 ? "Revisar pedidos" : undefined}
        />
        <KPICard
          icon={<Activity className="w-4 h-4 text-text-primary" />}
          label="Movimientos (7d)"
          value={kpis.movementsWeek}
          color="bg-cyan/20"
        />
      </div>

      {/* ── Kanban Board ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Kanban columns */}
        <div className="flex-[3] min-w-0 flex gap-3 min-h-0">
          <KanbanColumn
            title="Sin Stock"
            color="bg-red/10 text-red"
            dotColor="bg-red"
            products={kanban.out}
            icon={AlertCircle}
          />
          <KanbanColumn
            title="Bajo Mínimo"
            color="bg-amber/10 text-amber"
            dotColor="bg-amber"
            products={kanban.low}
            icon={AlertTriangle}
          />
          <KanbanColumn
            title="Stock OK"
            color="bg-blue/10 text-blue"
            dotColor="bg-blue"
            products={kanban.ok}
            icon={CheckCircle}
          />
          <KanbanColumn
            title="Excedido"
            color="bg-purple/10 text-purple"
            dotColor="bg-purple"
            products={kanban.excess}
            icon={TrendingUp}
          />
        </div>

        {/* Category chart */}
        <div className="flex-[1] min-w-[240px] max-w-[320px] bg-bg-panel rounded-xl border border-bg-active p-4 flex flex-col flex-shrink-0">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            Por Categoría
          </h3>
          <div className="flex-1 min-h-0">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="45%"
                    innerRadius="40%"
                    outerRadius="75%"
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                    strokeWidth={0}
                  >
                    {categories.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category] || "#6c7086"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e2e",
                      border: "1px solid #45475a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#bac2de" }}
                    formatter={(value: number, name: string) => [
                      `${value} productos`,
                      CATEGORY_LABELS[name] || name,
                    ]}
                  />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-dim text-xs">Sin datos</p>
              </div>
            )}
          </div>

          {/* Category summary list */}
          <div className="mt-3 space-y-1.5 border-t border-bg-active pt-3">
            {categories.slice(0, 6).map((cat) => (
              <div key={cat.category} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.category] || "#6c7086" }}
                />
                <span className="text-[10px] text-text-dim flex-1 truncate">
                  {CATEGORY_LABELS[cat.category] || cat.category}
                </span>
                <span className="text-[10px] text-text-secondary font-bold">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
