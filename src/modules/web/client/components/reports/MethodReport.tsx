import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COLORS = ['#10b981', '#3b82f6', '#06b6d4', '#f59e0b', '#a855f7', '#ef4444'];

export default function MethodReport({ data }: { data: any }) {
  const methods = data?.methods || [];
  const total = methods.reduce((sum: number, m: any) => sum + (m.total || 0), 0);

  return (
    <div className="space-y-4">
      {methods.length > 0 && (
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Distribución por método de pago</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={methods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="name"
                >
                  {methods.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {methods.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-text-secondary">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {methods.length > 0 && (
        <div className="bg-bg-section rounded-xl border border-bg-active/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active/30">
                <th className="text-left text-text-muted font-medium px-4 py-3">Método</th>
                <th className="text-right text-text-muted font-medium px-4 py-3">Tickets</th>
                <th className="text-right text-text-muted font-medium px-4 py-3">Total</th>
                <th className="text-right text-text-muted font-medium px-4 py-3">Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m: any, i: number) => (
                <tr key={i} className="border-b border-bg-active/20 last:border-b-0 hover:bg-bg/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-text-primary font-medium capitalize">{m.name}</span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 text-text-secondary">{m.tickets ?? 0}</td>
                  <td className="text-right px-4 py-3 text-text-primary font-medium">{formatCurrency(m.total ?? 0)}</td>
                  <td className="text-right px-4 py-3">
                    <span className="text-text-secondary">{(m.percentage ?? 0).toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-bg-active/30 bg-bg/30">
                <td className="px-4 py-3 text-text-primary font-semibold">Total</td>
                <td className="text-right px-4 py-3 text-text-primary font-semibold">
                  {methods.reduce((sum: number, m: any) => sum + (m.tickets ?? 0), 0)}
                </td>
                <td className="text-right px-4 py-3 text-text-primary font-semibold">{formatCurrency(total)}</td>
                <td className="text-right px-4 py-3 text-text-primary font-semibold">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {methods.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <p className="text-text-muted text-sm">No hay datos de métodos de pago</p>
        </div>
      )}
    </div>
  );
}
