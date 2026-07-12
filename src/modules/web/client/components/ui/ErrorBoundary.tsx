import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

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
                onClick={() => this.setState({ hasError: false, error: null })}
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
