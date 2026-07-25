import React from "react";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore, type CartItem as CartItemType } from "../../stores/cartStore";

type Props = {
  item: CartItemType;
};

export function CartItem({ item }: Props) {
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border/50 bg-muted/60 p-2 animate-fade-in sm:flex sm:items-center sm:gap-3">
      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">
          {item.name}
        </div>
        <div className="text-xs text-text-dim">
          ${item.price.toFixed(2)} x {item.qty} {item.unitType}
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => dec(item.sku)}
          aria-label={`Quitar uno de ${item.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="data-value w-10 text-center text-sm text-text-primary">
          {item.unitType === "pza"
            ? item.qty
            : item.qty.toFixed(1)}
        </span>
        <button
          onClick={() => inc(item.sku)}
          aria-label={`Agregar uno de ${item.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtotal */}
      <div className="data-value text-sm font-semibold text-text-primary sm:w-16 sm:text-right">
        ${(item.price * item.qty).toFixed(2)}
      </div>

      {/* Remove */}
      <button
        onClick={() => remove(item.sku)}
        aria-label={`Eliminar ${item.name}`}
        className="justify-self-end rounded-md p-2 text-muted-foreground transition-colors hover:bg-red/10 hover:text-red cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
