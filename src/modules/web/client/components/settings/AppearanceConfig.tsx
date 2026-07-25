import React from "react";
import {
  BadgeIcon,
  Check,
  Globe2,
  Image,
  Link as LinkIcon,
  MonitorCog,
  Moon,
  Palette,
  Save,
  ShoppingBag,
  Store,
  Sun,
  Type,
} from "lucide-react";
import { applyBranding, DEFAULT_FAVICON_URL, normalizeFaviconUrl, normalizeTabTitle } from "../../branding";
import { useUIStore } from "../../stores/uiStore";
import type { ColorScheme } from "../../stores/uiStore";

type FaviconSource = "favicon" | "google" | "custom";

type AppearanceData = {
  tabTitle: string;
  faviconSource: FaviconSource;
  faviconUrl: string;
};

type Preset = {
  id: string;
  source: FaviconSource;
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
};

const COLOR_SCHEMES: {
  id: ColorScheme;
  label: string;
  description: string;
  swatches: string[];
}[] = [
  {
    id: "standard",
    label: "Estándar",
    description: "Azul operativo, alto contraste y lectura neutral.",
    swatches: ["#2563eb", "#15803d", "#c2410c"],
  },
  {
    id: "dracula",
    label: "Dracula",
    description: "Morado y cian para turnos nocturnos.",
    swatches: ["#bd93f9", "#8be9fd", "#ffb86c"],
  },
  {
    id: "nord",
    label: "Nord",
    description: "Frío, calmado y con acentos discretos.",
    swatches: ["#5e81ac", "#88c0d0", "#a3be8c"],
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    description: "Cálido, contrastado y cómodo en pantallas largas.",
    swatches: ["#fabd2f", "#83a598", "#b8bb26"],
  },
  {
    id: "rose-pine",
    label: "Rosé Pine",
    description: "Suave, elegante y menos saturado.",
    swatches: ["#b4637a", "#286983", "#ea9d34"],
  },
];

const materialIcon = (path: string, fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#181825"/><path d="${path}" fill="${fill}"/></svg>`
  )}`;

const PRESETS: Preset[] = [
  {
    id: "local-pos",
    source: "favicon",
    label: "POS local",
    description: "Usa el favicon SVG incluido en la app.",
    icon: Store,
    href: DEFAULT_FAVICON_URL,
  },
  {
    id: "favicon-store",
    source: "favicon",
    label: "Favicon tienda",
    description: "Marca compacta generada como SVG.",
    icon: BadgeIcon,
    href: materialIcon("M12 14h24l-2 22H14L12 14Zm5-6h14l3 5H14l3-5Zm3 12v4h16v-4H20Z", "#94e2d5"),
  },
  {
    id: "google-storefront",
    source: "google",
    label: "Google Storefront",
    description: "Estilo Material Symbols para tienda.",
    icon: Store,
    href: materialIcon("M8 18 12 8h24l4 10v4h-2v18H10V22H8v-4Zm8 4v14h20V22H16Zm4 4h12v10H20V26Z", "#cba6f7"),
  },
  {
    id: "google-sale",
    source: "google",
    label: "Google Venta",
    description: "Icono Material para punto de venta.",
    icon: ShoppingBag,
    href: materialIcon("M14 12h20l2 28H12l2-28Zm5-6h10l3 6h-4l-1-2h-6l-1 2h-4l3-6Zm1 16h8v-4h4v4h4v4h-4v4h-4v-4h-8v-4Z", "#f9e2af"),
  },
];

const EMPTY: AppearanceData = {
  tabTitle: "",
  faviconSource: "favicon",
  faviconUrl: DEFAULT_FAVICON_URL,
};

export function AppearanceConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);
  const [config, setConfig] = React.useState<AppearanceData>(EMPTY);
  const [storeName, setStoreName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const faviconUrl = normalizeFaviconUrl(data.faviconUrl || DEFAULT_FAVICON_URL);
        setStoreName(data.storeName || "");
        setConfig({
          tabTitle: data.tabTitle || "",
          faviconSource: isFaviconSource(data.faviconSource) ? data.faviconSource : "favicon",
          faviconUrl,
        });
      })
      .catch(() => addToast("Error al cargar interfaz", "error"))
      .finally(() => setLoading(false));
  }, []);

  const selectedPreset = PRESETS.find((preset) => preset.href === config.faviconUrl);
  const previewTitle = normalizeTabTitle(config.tabTitle, storeName);
  const previewFavicon = normalizeFaviconUrl(config.faviconUrl);
  const customUrlInvalid = config.faviconSource === "custom" && !isSafeCustomUrl(config.faviconUrl);

  const selectPreset = (preset: Preset) => {
    setConfig((current) => ({
      ...current,
      faviconSource: preset.source,
      faviconUrl: preset.href,
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (customUrlInvalid) {
      addToast("URL de favicon inválida", "error");
      return;
    }

    const payload = {
      tabTitle: config.tabTitle.trim().slice(0, 64),
      faviconSource: config.faviconSource,
      faviconUrl: normalizeFaviconUrl(config.faviconUrl),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        applyBranding({ ...payload, storeName });
        addToast("Interfaz guardada", "success");
      } else {
        addToast("Error al guardar interfaz", "error");
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
        <MonitorCog className="w-5 h-5 text-mauve" />
        <h3 className="text-base font-bold text-text-primary">Interfaz</h3>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        <section className="rounded-lg border border-bg-active bg-bg/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-blue" />
              <div>
                <h4 className="text-sm font-bold text-text-primary">Tema de operación</h4>
                <p className="text-xs text-text-dim">Elige el modo y los colores de toda la app.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bg-active bg-bg-panel px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-active cursor-pointer"
            >
              {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {themeMode === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {COLOR_SCHEMES.map((scheme) => {
              const active = scheme.id === colorScheme;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => setColorScheme(scheme.id)}
                  className={`min-h-28 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                    active
                      ? "border-mauve bg-mauve/10 text-text-primary"
                      : "border-bg-active bg-bg-panel text-text-secondary hover:bg-bg-active/55"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {scheme.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                    {active && <Check className="h-4 w-4 text-green" />}
                  </div>
                  <div className="mt-3 text-sm font-semibold">{scheme.label}</div>
                  <div className="mt-1 text-xs leading-5 text-text-dim">{scheme.description}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-5">
          <div className="space-y-5">
            <Field label="Título del tab">
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  maxLength={64}
                  value={config.tabTitle}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, tabTitle: event.target.value }))
                  }
                  placeholder={storeName || "Vanity POS"}
                  className="w-full h-10 pl-10 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                />
              </div>
            </Field>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4 text-peach" />
                <h4 className="text-sm font-bold text-text-primary">Favicon</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESETS.map((preset) => {
                  const active = preset.href === config.faviconUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={`min-h-24 rounded-lg border p-4 text-left transition-all ${
                        active
                          ? "border-mauve bg-mauve/10 text-text-primary"
                          : "border-bg-active bg-bg hover:bg-bg-active/50 text-text-secondary"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <preset.icon className={active ? "w-5 h-5 text-mauve" : "w-5 h-5 text-text-dim"} />
                        {active && <Check className="w-4 h-4 text-green" />}
                      </div>
                      <div className="mt-3 text-sm font-semibold">{preset.label}</div>
                      <div className="mt-1 text-xs leading-5 text-text-dim">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="URL personalizada">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="url"
                  value={config.faviconSource === "custom" ? config.faviconUrl : ""}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      faviconSource: "custom",
                      faviconUrl: event.target.value,
                    }))
                  }
                  placeholder="https://.../favicon.svg"
                  className={`w-full h-10 pl-10 pr-3 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim focus:ring-1 focus:ring-mauve/20 transition-all ${
                    customUrlInvalid ? "border-red/70 focus:border-red/70" : "border-bg-active focus:border-mauve/50"
                  }`}
                />
              </div>
            </Field>
          </div>

          <div className="rounded-lg border border-bg-active bg-bg p-4 h-fit">
            <div className="text-xs font-medium text-text-dim uppercase tracking-wider">Vista previa</div>
            <div className="mt-4 rounded-lg border border-bg-active bg-bg-panel p-3">
              <div className="flex items-center gap-2 min-w-0">
                <img src={previewFavicon} alt="" className="w-5 h-5 rounded-sm bg-bg-active object-contain" />
                <span className="text-sm font-medium text-text-primary truncate">{previewTitle}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-dim">
              <Globe2 className="w-3.5 h-3.5" />
              {selectedPreset ? selectedPreset.label : "Personalizado"}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || customUrlInvalid}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function isFaviconSource(value: unknown): value is FaviconSource {
  return value === "favicon" || value === "google" || value === "custom";
}

function isSafeCustomUrl(value: string) {
  const href = value.trim();
  return !href || normalizeFaviconUrl(href) === href;
}
