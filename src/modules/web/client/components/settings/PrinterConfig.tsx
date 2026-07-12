import React from "react";
import { Printer, Save } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type PrinterConfigData = {
  printerEnabled: boolean;
  printerRequired: boolean;
  printerType: string;
  printerInterface: string;
  printerWidth: number;
  printerCharacterSet: string;
  receiptPromptOnSale: boolean;
  receiptDefaultDelivery: "ticket" | "digital" | "printed";
};

const PRINTER_TYPES = [
  { value: "Windows Printer", label: "Windows Printer" },
  { value: "TCP", label: "TCP / Red" },
  { value: "USB", label: "USB" },
  { value: "Archivo", label: "Archivo / Linux raw" },
];

const WIDTHS = [48, 58, 80];
const CHAR_SETS = ["PC437", "PC850", "PC858", "WIN1252", "ISO8859_1"];

const DEFAULT_CONFIG: PrinterConfigData = {
  printerEnabled: true,
  printerRequired: true,
  printerType: "Windows Printer",
  printerInterface: "printer:POS-80",
  printerWidth: 48,
  printerCharacterSet: "PC437",
  receiptPromptOnSale: true,
  receiptDefaultDelivery: "printed",
};

export function PrinterConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<PrinterConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          printerEnabled: data.printerEnabled !== "false",
          printerRequired: data.printerRequired !== "false",
          printerType: data.printerType || DEFAULT_CONFIG.printerType,
          printerInterface: data.printerInterface || DEFAULT_CONFIG.printerInterface,
          printerWidth: Number(data.printerWidth) || DEFAULT_CONFIG.printerWidth,
          printerCharacterSet: data.printerCharacterSet || DEFAULT_CONFIG.printerCharacterSet,
          receiptPromptOnSale: data.receiptPromptOnSale !== "false",
          receiptDefaultDelivery: isDelivery(data.receiptDefaultDelivery)
            ? data.receiptDefaultDelivery
            : DEFAULT_CONFIG.receiptDefaultDelivery,
        });
      })
      .catch(() => addToast("Error al cargar impresora", "error"))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof PrinterConfigData>(key: K, value: PrinterConfigData[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

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
        addToast("Configuración de impresora guardada", "success");
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
          {[1, 2, 3, 4].map((i) => (
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
        <Printer className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Impresora de Tickets</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        <Toggle
          title="Impresora térmica activa"
          description="Usar una térmica para tickets impresos."
          checked={config.printerEnabled}
          onChange={(checked) => set("printerEnabled", checked)}
        />

        <Toggle
          title="Requerir térmica para tickets"
          description="Mantiene el flujo preparado para operar con una impresora térmica local."
          checked={config.printerRequired}
          onChange={(checked) => set("printerRequired", checked)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Tipo">
            <select
              value={config.printerType}
              onChange={(e) => set("printerType", e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            >
              {PRINTER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Interfaz">
            <input
              type="text"
              value={config.printerInterface}
              onChange={(e) => set("printerInterface", e.target.value)}
              placeholder="printer:POS-80"
              className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all font-mono"
            />
          </Field>

          <Field label="Ancho">
            <select
              value={config.printerWidth}
              onChange={(e) => set("printerWidth", Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            >
              {WIDTHS.map((width) => (
                <option key={width} value={width}>
                  {width} columnas
                </option>
              ))}
            </select>
          </Field>

          <Field label="Charset">
            <select
              value={config.printerCharacterSet}
              onChange={(e) => set("printerCharacterSet", e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            >
              {CHAR_SETS.map((charset) => (
                <option key={charset} value={charset}>
                  {charset}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Comprobante por defecto">
            <select
              value={config.receiptDefaultDelivery}
              onChange={(e) =>
                set("receiptDefaultDelivery", e.target.value as PrinterConfigData["receiptDefaultDelivery"])
              }
              className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
            >
              <option value="printed">Impreso</option>
              <option value="digital">Digital</option>
              <option value="ticket">Ticket</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Toggle
              title="Preguntar al finalizar la compra"
              description="Mostrar opciones de comprobante digital, ticket o impreso después de registrar la venta."
              checked={config.receiptPromptOnSale}
              onChange={(checked) => set("receiptPromptOnSale", checked)}
            />
          </div>
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-active/50 border border-bg-active">
      <div>
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-xs text-text-dim mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-mauve" : "bg-bg-active"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function isDelivery(value: unknown): value is PrinterConfigData["receiptDefaultDelivery"] {
  return value === "ticket" || value === "digital" || value === "printed";
}
