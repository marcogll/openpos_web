import { TrendingUp, ShoppingBag, Hash, DollarSign, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-text-muted text-xs">{label}</p>
          <p className="text-text-primary text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MethodBar({ name, percentage, total }: { name: string; percentage: number; total: number }) {
  const colors: Record<string, string> = {
    efectivo: 'bg-green',
    tarjeta: 'bg-blue',
    transferencia: 'bg-cyan',
    otro: 'bg-amber',
  };
  const color = colors[name?.toLowerCase()] || 'bg-purple';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary capitalize">{name}</span>
        <span className="text-text-primary font-medium">{formatCurrency(total)}</span>
      </div>
      <div className="h-2 bg-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-text-muted text-xs text-right">{percentage.toFixed(1)}%</p>
    </div>
  );
}

export default function DailyReport({ data }: { data: any }) {
  const totals = data?.totals || {};
  const methods = data?.methods || [];
  const hourlyData = data?.hourly || [];

  const totalTickets = totals.totalTickets ?? 0;
  const itemsVendidos = totals.itemsVendidos ?? 0;
  const promedioPorTicket = totalTickets > 0 ? (totals.total ?? 0) / totalTickets : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          icon={<Hash className="w-4 h-4 text-text-primary" />}
          label="Total Tickets"
          value={totalTickets}
          color="bg-blue/20"
        />
        <KPICard
          icon={<ShoppingBag className="w-4 h-4 text-text-primary" />}
          label="Items Vendidos"
          value={itemsVendidos}
          color="bg-green/20"
        />
        <KPICard
          icon={<TrendingUp className="w-4 h-4 text-text-primary" />}
          label="Promedio por ticket"
          value={formatCurrency(promedioPorTicket)}
          color="bg-amber/20"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-text-muted" />
            <span className="text-text-muted text-xs">Subtotal</span>
          </div>
          <p className="text-text-primary text-xl font-bold">{formatCurrency(totals.subtotal ?? 0)}</p>
        </div>
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-text-muted" />
            <span className="text-text-muted text-xs">IVA</span>
          </div>
          <p className="text-text-primary text-xl font-bold">{formatCurrency(totals.iva ?? 0)}</p>
        </div>
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green" />
            <span className="text-text-muted text-xs">Total del día</span>
          </div>
          <p className="text-green text-xl font-bold">{formatCurrency(totals.total ?? 0)}</p>
        </div>
      </div>

      {methods.length > 0 && (
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Desglose por método de pago</h3>
          <div className="space-y-3">
            {methods.map((m: any, i: number) => (
              <MethodBar key={i} name={m.name} percentage={m.percentage} total={m.total} />
            ))}
          </div>
        </div>
      )}

      {hourlyData.length > 0 && (
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Ventas por hora</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <XAxis
                dataKey="hour"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                labelFormatter={(label) => `${label}:00`}
              />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
