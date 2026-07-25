import React from "react";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore, type CartItem as CartItemType } from "../../stores/cartStore";
import { Button } from "../ui/Button";

type Props = {
  item: CartItemType;
};

export function CartItem({ item }: Props) {
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border/50 bg-muted/60 p-2.5 animate-fade-in sm:flex sm:items-center sm:gap-3 sm:p-3">
      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary sm:truncate">
          {item.name}
        </div>
        <div className="text-xs text-text-dim">
          ${item.price.toFixed(2)} x {item.qty} {item.unitType}
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center justify-end gap-1 justify-self-end">
        <Button
          variant="outline"
          size="icon"
          onClick={() => dec(item.sku)}
          aria-label={`Quitar uno de ${item.name}`}
          className="bg-background/70 text-muted-foreground"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="data-value w-10 text-center text-base font-semibold text-text-primary sm:w-11">
          {item.unitType === "pza"
            ? item.qty
            : item.qty.toFixed(1)}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => inc(item.sku)}
          aria-label={`Agregar uno de ${item.name}`}
          className="bg-background/70 text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Subtotal */}
      <div className="data-value self-center text-base font-bold text-text-primary sm:w-20 sm:text-right">
        ${(item.price * item.qty).toFixed(2)}
      </div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => remove(item.sku)}
        aria-label={`Eliminar ${item.name}`}
        className="justify-self-end hover:bg-red/10 hover:text-red active:bg-red/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
