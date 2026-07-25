import React from "react";
import { Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { CartItem } from "./CartItem";
import { Button } from "../ui/Button";

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
      <div className="flex min-h-14 items-center justify-between border-b app-chrome-line bg-muted/40 px-3 py-2 sm:min-h-16 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="data-value text-sm font-bold text-text-primary">
              Ticket #{String(ticketNum).padStart(4, "0")}
            </span>
            <div className="text-xs text-text-dim">
              {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label="Limpiar carrito"
            className="hover:bg-red/10 hover:text-red"
            title="Limpiar carrito"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 overflow-auto overscroll-contain p-2 sm:p-3">
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
      <div className="space-y-2 border-t app-chrome-line bg-muted/35 p-3 sm:p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Subtotal</span>
          <span className="data-value text-text-secondary">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">IVA (16%)</span>
          <span className="data-value text-text-secondary">${tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-end justify-between">
          <span className="text-base font-bold text-text-primary">Total</span>
          <span className="data-value text-2xl font-extrabold text-green">${total.toFixed(2)}</span>
        </div>

        {/* Pay button */}
        <Button
          variant="success"
          size="touch"
          onClick={onPay}
          disabled={items.length === 0}
          className="mt-3 h-14 w-full text-base font-extrabold"
        >
          <CreditCard className="h-5 w-5" />
          Cobrar ({itemCount} {itemCount === 1 ? "item" : "items"})
        </Button>
      </div>
    </div>
  );
}
