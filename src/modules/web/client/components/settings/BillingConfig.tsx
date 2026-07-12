import React from "react";
import { Save, Receipt } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type BillingConfigData = {
  apiKey: string;
  provider: string;
  sandbox: boolean;
};

const PROVIDERS = [
  { value: "facturapi", label: "FacturAPI" },
  { value: "swsapi", label: "SW Sapi" },
  { value: "finkok", label: "Finkok" },
  { value: "efact", label: "eFact" },
];

export function BillingConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<BillingConfigData>({
    apiKey: "",
    provider: "facturapi",
    sandbox: true,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          apiKey: data.billingApiKey || "",
          provider: data.billingProvider || "facturapi",
          sandbox: data.billingSandbox ?? true,
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
          billingApiKey: config.apiKey,
          billingProvider: config.provider,
          billingSandbox: config.sandbox,
        }),
      });
      if (res.ok) {
        addToast("Configuración de facturación guardada", "success");
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
          {[1, 2, 3].map((i) => (
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
        <Receipt className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Facturación (CFDI)</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
            Proveedor de facturación
          </label>
          <select
            value={config.provider}
            onChange={(e) => setConfig((c) => ({ ...c, provider: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all appearance-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
            API Key
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
            placeholder="sk_live_..."
            className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all font-mono"
          />
        </div>

        {/* Sandbox toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-bg-active/50 border border-bg-active">
          <div>
            <div className="text-sm font-medium text-text-primary">Modo Sandbox</div>
            <div className="text-xs text-text-dim mt-0.5">
              Usar entorno de pruebas para facturación
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig((c) => ({ ...c, sandbox: !c.sandbox }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.sandbox ? "bg-mauve" : "bg-bg-active"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.sandbox ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
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
