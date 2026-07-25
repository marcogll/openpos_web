import React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { Product } from "../../stores/cartStore";

type Props = {
  product: Product;
  onAdd: (p: Product) => void;
};

const CATEGORY_COLORS: Record<string, string> = {
  BEB: "bg-blue/10 text-blue",
  BOT: "bg-amber/10 text-amber",
  GEN: "bg-text-dim/10 text-text-muted",
  UNG: "bg-purple/10 text-purple",
  SER: "bg-pink/10 text-pink",
};

export function ProductCard({ product, onAdd }: Props) {
  const isService =
    product.category?.toUpperCase() === "SER" ||
    product.unitType?.toLowerCase() === "servicio";
  const lowStock =
    !isService && product.minStock !== null && product.stock <= product.minStock;
  const outOfStock = !isService && product.stock <= 0;
  const inactive = product.active === 0;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={outOfStock || inactive}
      aria-label={`Agregar ${product.name}, precio ${product.price.toFixed(2)}`}
      className={`group relative flex min-h-44 flex-col rounded-lg border p-3 text-left transition-all duration-200 ${
        outOfStock || inactive
          ? "bg-card/50 border-border/60 opacity-55 cursor-not-allowed"
          : "bg-card border-border/70 shadow-card hover:border-primary/45 hover:bg-primary/5 cursor-pointer active:bg-primary/10"
      }`}
    >
      {/* Category badge */}
      <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
        <span
          className={`max-w-[7rem] truncate rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            CATEGORY_COLORS[product.category] || "bg-muted text-muted-foreground"
          }`}
        >
          {product.category || "GEN"}
        </span>
        {lowStock && !outOfStock && (
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber" aria-label="Stock bajo" />
        )}
      </div>

      {/* Name */}
      <h3 className="line-clamp-3 flex-1 text-base font-semibold leading-snug text-text-primary">
        {product.name}
      </h3>

      {/* Price + Stock */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="data-value text-xl font-bold text-green">
            ${product.price.toFixed(2)}
          </div>
          <div className="truncate text-xs text-text-dim">
            {isService ? "Servicio" : `Stock: ${product.stock} ${product.unitType}`}
          </div>
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
          <Plus className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
