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
    <div className="flex h-full flex-col gap-3 animate-fade-in lg:gap-4">
      <div className="flex flex-col gap-3 rounded-lg border app-chrome-line bg-card/72 px-4 py-3 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">
            Punto de venta
          </h1>
          <p className="text-xs text-muted-foreground">
            Productos, carrito y cobro en una vista compacta.
          </p>
        </div>
        <div className="w-fit rounded-lg border border-border/70 bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {items.length} {items.length === 1 ? "producto" : "productos"} en ticket
        </div>
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Main content: Products + Cart */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row xl:gap-4">
        {/* Products grid */}
        <div className="min-h-0 min-w-0 flex-1">
          <ProductGrid search={search} />
        </div>

        {/* Cart sidebar */}
        <div className="min-h-[22rem] flex-shrink-0 xl:w-80">
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
