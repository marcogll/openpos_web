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
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/70 overflow-hidden shadow-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-text-primary">
            Ticket #{String(ticketNum).padStart(4, "0")}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="rounded-md p-1.5 text-muted-foreground hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
            title="Limpiar carrito"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7 opacity-60" />
            </div>
            <p className="text-sm font-medium text-foreground">Carrito vacío</p>
            <p className="text-xs mt-1">Haz click en un producto</p>
          </div>
        ) : (
          items.map((item) => <CartItem key={item.sku} item={item} />)
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-border/70 bg-muted/35 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Subtotal</span>
          <span className="text-text-secondary">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">IVA (16%)</span>
          <span className="text-text-secondary">${tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-text-primary">Total</span>
          <span className="text-xl font-bold text-green tabular-nums">${total.toFixed(2)}</span>
        </div>

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          className="w-full h-12 mt-2 rounded-xl bg-green text-bg font-bold text-sm flex items-center justify-center gap-2 shadow-card hover:bg-green-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <CreditCard className="w-5 h-5" />
          Cobrar ({itemCount} {itemCount === 1 ? "item" : "items"})
        </button>
      </div>
    </div>
  );
}
