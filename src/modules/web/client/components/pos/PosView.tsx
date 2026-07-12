import React from "react";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { SearchBar } from "./SearchBar";
import { PayModal } from "./PayModal";
import { useCartStore } from "../../stores/cartStore";

export function PosView() {
  const [search, setSearch] = React.useState("");
  const [showPay, setShowPay] = React.useState(false);
  const items = useCartStore((s) => s.items);

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-card backdrop-blur">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Punto de venta
          </h1>
          <p className="text-xs text-muted-foreground">
            Productos, carrito y cobro en una vista compacta.
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {items.length} {items.length === 1 ? "producto" : "productos"} en ticket
        </div>
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Main content: Products + Cart */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Products grid */}
        <div className="flex-1 min-w-0">
          <ProductGrid search={search} />
        </div>

        {/* Cart sidebar */}
        <div className="w-80 flex-shrink-0">
          <Cart onPay={() => setShowPay(true)} />
        </div>
      </div>

      {/* Pay Modal */}
      {showPay && (
        <PayModal
          onClose={() => setShowPay(false)}
          onConfirm={() => {
            setShowPay(false);
          }}
        />
      )}
    </div>
  );
}
