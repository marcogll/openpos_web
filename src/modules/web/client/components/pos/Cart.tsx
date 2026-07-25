import React from "react";
import { Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { CartItem } from "./CartItem";

type Props = {
  onPay: () => void;
};

export function Cart({ onPay }: Props) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const itemCount = useCartStore((s) => s.itemCount());
  const clear = useCartStore((s) => s.clear);
  const ticketNum = useCartStore((s) => s.ticketNum);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border app-chrome-line bg-card shadow-panel">
      {/* Header */}
      <div className="flex min-h-14 items-center justify-between border-b app-chrome-line bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <span className="data-value text-sm font-semibold text-text-primary">
            Ticket #{String(ticketNum).padStart(4, "0")}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            aria-label="Limpiar carrito"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red/10 hover:text-red cursor-pointer"
            title="Limpiar carrito"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center text-muted-foreground">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <ShoppingBag className="h-7 w-7 opacity-60" />
            </div>
            <p className="text-sm font-medium text-foreground">Carrito vacío</p>
            <p className="mt-1 text-xs">Agrega productos desde el catálogo</p>
          </div>
        ) : (
          items.map((item) => <CartItem key={item.sku} item={item} />)
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 border-t app-chrome-line bg-muted/35 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Subtotal</span>
          <span className="data-value text-text-secondary">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">IVA (16%)</span>
          <span className="data-value text-text-secondary">${tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-text-primary">Total</span>
          <span className="data-value text-xl font-bold text-green">${total.toFixed(2)}</span>
        </div>

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-green text-sm font-bold text-bg shadow-card transition-all hover:bg-green-bright disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <CreditCard className="h-5 w-5" />
          Cobrar ({itemCount} {itemCount === 1 ? "item" : "items"})
        </button>
      </div>
    </div>
  );
}
