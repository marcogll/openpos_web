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
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/60 border border-border/50 animate-fade-in">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">
          {item.name}
        </div>
        <div className="text-xs text-text-dim">
          ${item.price.toFixed(2)} x {item.qty} {item.unitType}
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => dec(item.sku)}
          className="w-6 h-6 rounded-md bg-background/70 border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-10 text-center text-sm font-mono text-text-primary">
          {item.unitType === "pza"
            ? item.qty
            : item.qty.toFixed(1)}
        </span>
        <button
          onClick={() => inc(item.sku)}
          className="w-6 h-6 rounded-md bg-background/70 border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Subtotal */}
      <div className="text-sm font-semibold text-text-primary w-16 text-right">
        ${(item.price * item.qty).toFixed(2)}
      </div>

      {/* Remove */}
      <button
        onClick={() => remove(item.sku)}
        className="rounded-md p-1 text-muted-foreground hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
