import React from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <label className="relative block rounded-lg shadow-card">
      <span className="sr-only">Buscar producto por nombre, SKU o código de barras</span>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar producto por nombre, SKU o código de barras..."
        className="h-12 w-full rounded-lg border border-border bg-card pl-12 pr-12 text-base text-foreground transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/15"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </label>
  );
}
