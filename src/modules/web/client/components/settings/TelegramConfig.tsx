import React from "react";
import { Copy, Save, Send, ShieldCheck } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

type TelegramConfigData = {
  telegramBotToken: string;
  telegramWebhookSecret: string;
};

const EMPTY: TelegramConfigData = {
  telegramBotToken: "",
  telegramWebhookSecret: "",
};

export function TelegramConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<TelegramConfigData>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          telegramBotToken: data.telegramBotToken || "",
          telegramWebhookSecret: data.telegramWebhookSecret || "",
        });
      })
      .catch(() => addToast("Error al cargar configuración de Telegram", "error"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof TelegramConfigData, value: string) =>
    setConfig((current) => ({ ...current, [key]: value }));

  const webhookPath = config.telegramWebhookSecret
    ? `/api/telegram/webhook/${config.telegramWebhookSecret}`
    : "/api/telegram/webhook";
  const webhookUrl = `${window.location.origin}${webhookPath}`;

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    addToast("Webhook copiado", "success");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      addToast(res.ok ? "Configuración de Telegram guardada" : "Error al guardar", res.ok ? "success" : "error");
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
              <div className="h-3 w-28 bg-bg-active rounded animate-pulse-slow" />
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
        <Send className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Telegram</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        <Field
          label="Bot token"
          type="password"
          value={config.telegramBotToken}
          onChange={(value) => set("telegramBotToken", value)}
          placeholder="123456789:AA..."
        />

        <Field
          label="Webhook secret"
          type="password"
          value={config.telegramWebhookSecret}
          onChange={(value) => set("telegramWebhookSecret", value)}
          placeholder="secreto-privado"
        />

        <div className="rounded-lg border border-bg-active bg-bg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                <ShieldCheck className="w-4 h-4 text-blue" />
                Webhook URL
              </div>
              <code className="block mt-2 text-xs text-text-secondary break-all">
                {webhookUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={copyWebhook}
              className="h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-lg bg-bg-active text-text-secondary hover:text-text-primary"
              title="Copiar webhook"
            >
              <Copy className="w-4 h-4" />
            </button>
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
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all font-mono"
      />
    </div>
  );
}
