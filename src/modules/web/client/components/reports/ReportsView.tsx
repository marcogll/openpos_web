import { useState, useEffect } from 'react';
import { BarChart3, CreditCard, ShoppingBag, Clock, Loader2 } from 'lucide-react';
import DailyReport from './DailyReport';
import MethodReport from './MethodReport';
import ProductReport from './ProductReport';
import HourlyReport from './HourlyReport';

type Tab = 'day' | 'method' | 'products' | 'hourly';

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'day', label: 'Resumen del día', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'method', label: 'Por método de pago', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'products', label: 'Top productos', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'hourly', label: 'Por hora', icon: <Clock className="w-4 h-4" /> },
];

const endpoints: Record<Tab, string> = {
  day: '/api/reports/daily',
  method: '/api/reports/method',
  products: '/api/reports/products',
  hourly: '/api/reports/hourly',
};

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<Tab>('day');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(endpoints[activeTab])
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar reporte');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-bg-panel rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-text-primary">Reportes</h2>
      </div>

      <div className="flex gap-1 px-4 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-bg-active text-text-primary'
                : 'text-text-secondary hover:bg-bg-section hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-text-muted animate-spin" />
            <span className="ml-3 text-text-secondary">Cargando datos...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red text-sm font-medium">Error</p>
              <p className="text-text-muted text-xs mt-1">{error}</p>
              <button
                onClick={() => setActiveTab(activeTab)}
                className="mt-3 px-4 py-2 bg-bg-section rounded-lg text-text-secondary text-xs hover:text-text-primary transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {activeTab === 'day' && <DailyReport data={data} />}
            {activeTab === 'method' && <MethodReport data={data} />}
            {activeTab === 'products' && <ProductReport data={data} />}
            {activeTab === 'hourly' && <HourlyReport data={data} />}
          </>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-64">
            <p className="text-text-muted text-sm">Sin datos disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
