import React from "react";
import { AlertTriangle, Plus, Scissors } from "lucide-react";
import type { Product } from "../../stores/cartStore";
import { getCategoryMeta } from "./categoryMeta";

type Props = {
  product: Product;
  onAdd: (p: Product) => void;
};

export function ProductCard({ product, onAdd }: Props) {
  const isService =
    product.category?.toUpperCase() === "SER" ||
    product.unitType?.toLowerCase() === "servicio";
  const lowStock =
    !isService && product.minStock !== null && product.stock <= product.minStock;
  const outOfStock = !isService && product.stock <= 0;
  const inactive = product.active === 0;
  const unitLabel = product.unitType || "pza";
  const categoryMeta = getCategoryMeta(product.category);
  const CategoryIcon = isService ? Scissors : categoryMeta.icon;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={outOfStock || inactive}
      aria-label={`Agregar ${product.name}, precio ${product.price.toFixed(2)}`}
      className={`group relative flex min-h-36 flex-col rounded-lg border p-2.5 text-left transition-all duration-150 active:scale-[0.99] sm:min-h-48 sm:p-4 lg:min-h-52 ${
        outOfStock || inactive
          ? "bg-card/50 border-border/60 opacity-55 cursor-not-allowed"
          : "bg-card border-border/70 shadow-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-panel cursor-pointer active:bg-primary/10"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20">
          <CategoryIcon className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex max-w-[10rem] items-center gap-1 truncate rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryMeta.className}`}
        >
          {categoryMeta.label}
        </span>
      </div>

      <h3 className="line-clamp-3 flex-1 text-sm font-semibold leading-snug text-text-primary sm:text-base">
        {product.name}
      </h3>

      <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3">
        <div className="min-w-0">
          <div className="data-value text-xl font-extrabold text-green sm:text-2xl">
            ${product.price.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-text-dim">
            {lowStock && !outOfStock && (
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber" aria-label="Stock bajo" />
            )}
            {isService ? "Servicio" : `Stock: ${product.stock} ${unitLabel}`}
          </div>
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card ring-1 ring-primary/30 transition-transform group-hover:scale-105 sm:h-14 sm:w-14">
          <Plus className="h-6 w-6" />
        </div>
      </div>
    </button>
  );
}
