import React from "react";
import { Save, Percent, Hash } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type TaxData = {
  taxRate: number;
  lastTicket: number;
};

export function TaxConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<TaxData>({ taxRate: 16, lastTicket: 1 });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          taxRate: data.taxRate ?? 16,
          lastTicket: data.lastTicket ?? 1,
        });
      })
      .catch(() => addToast("Error al cargar configuración", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxRate: config.taxRate,
          lastTicket: config.lastTicket,
        }),
      });
      if (res.ok) {
        addToast("Configuración de impuestos guardada", "success");
      } else {
        addToast("Error al guardar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 bg-bg-active rounded animate-pulse-slow" />
              <div className="h-10 bg-bg-active rounded-lg animate-pulse-slow" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
      <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
        <Percent className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Impuestos</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        {/* Tax Rate */}
        <div>
          <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
            Tasa de IVA (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={config.taxRate}
              onChange={(e) =>
                setConfig((c) => ({ ...c, taxRate: parseFloat(e.target.value) || 0 }))
              }
              className="w-full h-10 px-3 pr-8 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">
              %
            </span>
          </div>
          <p className="text-xs text-text-dim mt-1.5">
            Tasa estándar en México: 16%
          </p>
        </div>

        {/* Last Ticket */}
        <div>
          <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
            Último número de ticket
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              type="number"
              min="1"
              value={config.lastTicket}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  lastTicket: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full h-10 pl-10 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            />
          </div>
          <p className="text-xs text-text-dim mt-1.5">
            El siguiente ticket será #{config.lastTicket + 1}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mauve text-bg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
