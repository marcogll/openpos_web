import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

const CHUNK_RELOAD_KEY = "openpos:chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

function isDynamicImportError(error: Error | null) {
  const message = error?.message || "";
  const name = error?.name || "";

  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(
    `${name} ${message}`
  );
}

function reloadFresh() {
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.assign(url.toString());
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (!isDynamicImportError(error) || typeof window === "undefined") return;

    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return;

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    reloadFresh();
  }

  private retry = () => {
    if (isDynamicImportError(this.state.error) && typeof window !== "undefined") {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      reloadFresh();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
          <div className="bg-bg-panel rounded-2xl border border-bg-active p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">
              Algo salió mal
            </h2>
            <p className="text-sm text-text-muted mb-1">
              {this.state.error?.message || "Error desconocido"}
            </p>
            <p className="text-xs text-text-dim mb-6">
              La vista no se pudo cargar correctamente.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.retry}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-active text-text-secondary text-sm font-medium hover:bg-bg-section hover:text-text-primary transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <a
                href="/pos"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
              >
                <Home className="w-4 h-4" />
                Ir a Punto de Venta
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
