import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductReport({ data }: { data: any }) {
  const products = data?.products || [];
  const top5 = products.slice(0, 5);

  return (
    <div className="space-y-4">
      {top5.length > 0 && (
        <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top 5 productos por ingreso</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top5} layout="vertical" margin={{ left: 80 }}>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#d1d5db', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(v) => v?.length > 12 ? `${v.slice(0, 12)}...` : v}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [formatCurrency(value), 'Ingreso']}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-bg-section rounded-xl border border-bg-active/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-active/30">
                <th className="text-center text-text-muted font-medium px-4 py-3 w-12">#</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Producto</th>
                <th className="text-right text-text-muted font-medium px-4 py-3">Unidades</th>
                <th className="text-right text-text-muted font-medium px-4 py-3">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any, i: number) => (
                <tr key={i} className="border-b border-bg-active/20 last:border-b-0 hover:bg-bg/50">
                  <td className="text-center px-4 py-3 text-text-muted font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-text-primary font-medium">{p.name}</span>
                  </td>
                  <td className="text-right px-4 py-3 text-text-secondary">{p.quantity ?? 0}</td>
                  <td className="text-right px-4 py-3 text-text-primary font-medium">{formatCurrency(p.revenue ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <p className="text-text-muted text-sm">No hay datos de productos</p>
        </div>
      )}
    </div>
  );
}
