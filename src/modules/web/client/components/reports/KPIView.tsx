import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  DollarSign,
  Gauge,
  Loader2,
  Package,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthStore } from "../../stores/authStore";

const COLORS = [
  "var(--color-primary)",
  "var(--color-blue)",
  "var(--color-green)",
  "var(--color-amber)",
  "var(--color-orange)",
  "var(--color-red)",
  "var(--color-cyan)",
  "var(--color-pink)",
];
const CHART_GRID = "color-mix(in srgb, var(--color-border) 55%, transparent)";
const CHART_TICK = "var(--color-text-muted)";
const CHART_SURFACE = "var(--color-bg-panel)";
const CHART_BORDER = "var(--color-border)";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value: number) => `${Math.round(Number(value || 0))}%`;

function numberCompact(value: number) {
  return new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

function metricTone(value: number, warn: number, danger: number) {
  if (value >= danger) return "text-red bg-red/10 border-red/20";
  if (value >= warn) return "text-amber bg-amber/10 border-amber/20";
  return "text-green bg-green/10 border-green/20";
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-mauve bg-mauve/10 border-mauve/20",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border app-chrome-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-text-dim truncate">{label}</div>
          <div className="data-value mt-1 truncate text-2xl font-bold leading-tight text-text-primary">{value}</div>
          {sub && <div className="mt-1 text-xs text-text-muted truncate">{sub}</div>}
        </div>
        <div className={`rounded-lg border p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border app-chrome-line bg-card">
      <div className="flex min-h-12 items-center gap-2 border-b app-chrome-line px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function RankingBars({
  rows,
  valueKey,
  labelKey = "name",
  format = numberCompact,
}: {
  rows: any[];
  valueKey: string;
  labelKey?: string;
  format?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="space-y-3">
      {rows.slice(0, 7).map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div key={`${row.sku || row[labelKey]}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-text-secondary">{row[labelKey]}</span>
              <span className="data-value font-semibold text-text-primary">{format(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-bg-section overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}
              />
            </div>
          </div>
        );
      })}
      {rows.length === 0 && <div className="text-sm text-text-muted">Sin datos</div>}
    </div>
  );
}

export default function KPIView() {
  const { user } = useAuthStore();
  const [data, setData] = React.useState<any>(null);
  const [productsData, setProductsData] = React.useState<any>(null);
  const [usersData, setUsersData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const hasAccess = user?.role === "owner-admin" || user?.role === "admin";

  React.useEffect(() => {
    if (!hasAccess) {
      setError("Sin permisos para KPIs");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/kpis").then((r) => {
        if (!r.ok) throw new Error("KPIs");
        return r.json();
      }),
      fetch("/api/kpis/products").then((r) => {
        if (!r.ok) throw new Error("Inventario");
        return r.json();
      }),
      fetch("/api/kpis/users").then((r) => {
        if (!r.ok) throw new Error("Usuarios");
        return r.json();
      }),
    ])
      .then(([overview, products, users]) => {
        if (cancelled) return;
        setData(overview);
        setProductsData(products);
        setUsersData(users);
      })
      .catch((err) => {
        if (!cancelled) setError(`Error al cargar ${err.message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-border/70 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-red" />
          <div className="text-sm font-semibold text-text-primary">Acceso restringido</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-border/70 bg-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red" />
          <div className="text-sm font-semibold text-text-primary">{error || "Sin datos"}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const inventory = data.inventory || {};
  const money = data.money || {};
  const riskCount = Number(inventory.outOfStock || 0) + Number(inventory.lowStock || 0);
  const totalProducts = Number(inventory.totalProducts || productsData?.summary?.totalProducts || 0);
  const riskPct = totalProducts > 0 ? (riskCount / totalProducts) * 100 : 0;
  const stockHealth = [
    { name: "Sano", value: inventory.healthy || 0 },
    { name: "Exceso", value: inventory.excessStock || 0 },
    { name: "Bajo", value: inventory.lowStock || 0 },
    { name: "Sin stock", value: inventory.outOfStock || 0 },
  ];
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const found = data.hourlySales?.find((item: any) => Number(item.hour) === hour);
    return { hour: `${String(hour).padStart(2, "0")}:00`, total: Number(found?.total || 0), count: Number(found?.count || 0) };
  });
  const salesByDay = (data.salesByDay || []).map((item: any) => ({
    ...item,
    label: String(item.date).slice(5, 10),
  }));

  return (
      <div className="h-full overflow-y-auto rounded-lg bg-bg-panel p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">KPIs de tienda</h2>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${metricTone(riskPct, 20, 35)}`}>
          Riesgo inventario {formatPercent(riskPct)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={DollarSign} label="Ventas hoy" value={formatCurrency(data.currentDay?.totalSales)} sub={`${data.currentDay?.totalTickets || 0} tickets`} tone="text-green bg-green/10 border-green/20" />
        <StatCard icon={TrendingUp} label="Margen estimado" value={formatPercent(money.marginPct)} sub={formatCurrency(money.grossProfit)} tone="text-blue bg-blue/10 border-blue/20" />
        <StatCard icon={Package} label="Valor inventario" value={formatCurrency(inventory.stockValue)} sub={`${totalProducts} productos`} tone="text-mauve bg-mauve/10 border-mauve/20" />
        <StatCard icon={AlertTriangle} label="Stock bajo/sin stock" value={String(riskCount)} sub={`${inventory.lowStock || 0} bajo, ${inventory.outOfStock || 0} sin stock`} tone={metricTone(riskPct, 20, 35)} />
        <StatCard icon={Users} label="Clientes activos" value={String(data.clients || 0)} sub={`${usersData?.total || 0} usuarios`} tone="text-cyan bg-cyan/10 border-cyan/20" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Dinero por día" icon={DollarSign}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-green)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="var(--color-green)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART_TICK, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} tickFormatter={numberCompact} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: CHART_SURFACE, border: `1px solid ${CHART_BORDER}` }} />
                <Area type="monotone" dataKey="totalSales" stroke="var(--color-green)" fill="url(#salesFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Inventario general" icon={Package}>
          <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockHealth} innerRadius={48} outerRadius={78} paddingAngle={2} dataKey="value">
                    {stockHealth.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: CHART_SURFACE, border: `1px solid ${CHART_BORDER}` }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 self-center">
              {stockHealth.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    {item.name}
                  </span>
                  <span className="data-value font-semibold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Más vendidos" icon={ShoppingBag}>
          <RankingBars rows={data.topProducts || []} valueKey="revenue" format={formatCurrency} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Rotación de materiales" icon={Activity}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rotation || []} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_TICK, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: CHART_TICK, fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatPercent(value)} contentStyle={{ background: CHART_SURFACE, border: `1px solid ${CHART_BORDER}` }} />
                <Bar dataKey="rotation" radius={[0, 6, 6, 0]}>
                  {(data.rotation || []).map((_: any, index: number) => <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Horas fuertes" icon={Clock}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: CHART_TICK, fontSize: 10 }} interval={2} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} tickFormatter={numberCompact} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: CHART_SURFACE, border: `1px solid ${CHART_BORDER}` }} />
                <Bar dataKey="total" fill="var(--color-blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Valor por categoría" icon={BarChart3}>
          <RankingBars rows={inventory.categories || []} labelKey="category" valueKey="stockValue" format={formatCurrency} />
        </Panel>
        <Panel title="Alertas operativas" icon={AlertTriangle}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-red/10 p-4 text-center">
              <div className="text-2xl font-bold text-red">{inventory.outOfStock || 0}</div>
              <div className="text-xs text-text-muted">Sin stock</div>
            </div>
            <div className="rounded-lg bg-amber/10 p-4 text-center">
              <div className="text-2xl font-bold text-amber">{inventory.lowStock || 0}</div>
              <div className="text-xs text-text-muted">Debajo mínimo</div>
            </div>
            <div className="rounded-lg bg-blue/10 p-4 text-center">
              <div className="text-2xl font-bold text-blue">{inventory.excessStock || 0}</div>
              <div className="text-xs text-text-muted">Sobreinventario</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
