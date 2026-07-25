import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "border-green bg-green/10 text-green",
  error: "border-red bg-red/10 text-red",
  warning: "border-amber bg-amber/10 text-amber",
  info: "border-blue bg-blue/10 text-blue",
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 animate-slide-up sm:inset-x-auto sm:bottom-4 sm:right-4">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${COLORS[toast.type]} sm:min-w-[280px]`}
            role="status"
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
              className="rounded p-1 text-current opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
