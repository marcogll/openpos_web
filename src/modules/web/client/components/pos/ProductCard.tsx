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
      className={`relative flex min-h-36 flex-col p-3 rounded-xl border text-left transition-all duration-200 group ${
        outOfStock || inactive
          ? "bg-card/50 border-border/60 opacity-50 cursor-not-allowed"
           : "bg-card border-border/70 shadow-card hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]"
      }`}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-current/10 ${
            CATEGORY_COLORS[product.category] || "bg-muted text-muted-foreground"
          }`}
        >
          {product.category}
        </span>
        {lowStock && !outOfStock && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber" />
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-medium text-text-primary leading-tight line-clamp-2 flex-1">
        {product.name}
      </h3>

      {/* Price + Stock */}
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-lg font-bold text-green tabular-nums">
            ${product.price.toFixed(2)}
          </div>
          <div className="text-[10px] text-text-dim">
            {isService ? "Servicio" : `Stock: ${product.stock} ${product.unitType}`}
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-card">
          <Plus className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}
