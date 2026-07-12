import React from "react";
import { Save, Building2 } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type Config = {
  storeName: string;
  storeRfc: string;
  storeLegalName: string;
  storeAddress: string;
  storeEmail: string;
  storePhone: string;
  storeRegimen: string;
};

const EMPTY: Config = {
  storeName: "",
  storeRfc: "",
  storeLegalName: "",
  storeAddress: "",
  storeEmail: "",
  storePhone: "",
  storeRegimen: "",
};

export function StoreConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<Config>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          storeName: data.storeName || "",
          storeRfc: data.storeRfc || "",
          storeLegalName: data.storeLegalName || "",
          storeAddress: data.storeAddress || "",
          storeEmail: data.storeEmail || "",
          storePhone: data.storePhone || "",
          storeRegimen: data.storeRegimen || "",
        });
      })
      .catch(() => addToast("Error al cargar configuración", "error"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Config, value: string) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        addToast("Configuración guardada", "success");
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
          {[1, 2, 3, 4, 5].map((i) => (
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
        <Building2 className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Datos de la Tienda</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Nombre de la tienda"
            value={config.storeName}
            onChange={(v) => set("storeName", v)}
          />
          <Field
            label="RFC"
            value={config.storeRfc}
            onChange={(v) => set("storeRfc", v)}
            placeholder="XAXX010101000"
          />
          <Field
            label="Razón social"
            value={config.storeLegalName}
            onChange={(v) => set("storeLegalName", v)}
            className="md:col-span-2"
          />
          <Field
            label="Dirección"
            value={config.storeAddress}
            onChange={(v) => set("storeAddress", v)}
            className="md:col-span-2"
          />
          <Field
            label="Email"
            type="email"
            value={config.storeEmail}
            onChange={(v) => set("storeEmail", v)}
          />
          <Field
            label="Teléfono"
            value={config.storePhone}
            onChange={(v) => set("storePhone", v)}
          />
          <Field
            label="Régimen fiscal"
            value={config.storeRegimen}
            onChange={(v) => set("storeRegimen", v)}
            placeholder="601 - General de Ley Personas Morales"
          />
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
      />
    </div>
  );
}
