import React from "react";
import { Scissors } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mauve/10 flex items-center justify-center animate-pulse-slow">
          <Scissors className="w-5 h-5 text-mauve" />
        </div>
        <div className="text-sm text-text-muted">Cargando...</div>
      </div>
    </div>
  );
}
