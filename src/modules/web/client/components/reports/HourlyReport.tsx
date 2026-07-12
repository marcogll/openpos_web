import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HourlyReport({ data }: { data: any }) {
  const hourly = data?.hourly || [];

  const peakHour = hourly.reduce(
    (peak: any, curr: any) => (curr.total > (peak?.total ?? 0) ? curr : peak),
    hourly[0]
  );

  const allZero = hourly.every((h: any) => !h.total || h.total === 0);

  return (
    <div className="space-y-4">
      {hourly.length > 0 && (
        <>
          {peakHour && peakHour.total > 0 && (
            <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
              <p className="text-text-muted text-xs">Hora pico</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-amber text-2xl font-bold">{peakHour.hour}:00</span>
                <span className="text-text-secondary text-sm">{formatCurrency(peakHour.total)}</span>
              </div>
            </div>
          )}

          <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Ventas por hora</h3>
            {allZero ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-text-muted text-sm">Sin ventas registradas hoy</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hourly} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(h) => `${h}:00`}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 5, fill: '#f59e0b' }}
                  />
                  {peakHour && peakHour.total > 0 && (
                    <ReferenceDot
                      x={peakHour.hour}
                      y={peakHour.total}
                      r={6}
                      fill="#ef4444"
                      stroke="#ef4444"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-bg-section rounded-xl p-4 border border-bg-active/30">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Detalle por hora</h3>
            <div className="grid grid-cols-6 gap-2">
              {hourly.map((h: any) => (
                <div
                  key={h.hour}
                  className={`text-center p-2 rounded-lg ${
                    h.hour === peakHour?.hour && h.total > 0
                      ? 'bg-amber/10 border border-amber/30'
                      : 'bg-bg/50'
                  }`}
                >
                  <p className="text-text-muted text-xs">{h.hour}:00</p>
                  <p className={`text-xs font-medium mt-0.5 ${
                    h.hour === peakHour?.hour && h.total > 0 ? 'text-amber' : 'text-text-secondary'
                  }`}>
                    {formatCurrency(h.total ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {hourly.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <p className="text-text-muted text-sm">No hay datos por hora</p>
        </div>
      )}
    </div>
  );
}
