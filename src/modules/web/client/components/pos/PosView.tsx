import React from "react";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { SearchBar } from "./SearchBar";
import { PayModal } from "./PayModal";

export function PosView() {
  const [search, setSearch] = React.useState("");
  const [showPay, setShowPay] = React.useState(false);

  return (
    <div className="flex min-h-full flex-col gap-3 animate-fade-in lg:gap-4 xl:h-full xl:min-h-0">
      <div className="flex flex-col gap-3 rounded-lg border app-chrome-line bg-card/85 px-4 py-3 shadow-card backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">
            Caja
          </h1>
          <p className="text-sm text-muted-foreground">
            Escanea, toca productos y cobra sin cambiar de pantalla.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground sm:flex sm:text-left">
          <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2">
            Buscar
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2">
            Agregar
          </div>
          <div className="rounded-lg border border-border/70 bg-green/10 px-3 py-2 text-green">
            Cobrar
          </div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div className="grid flex-1 grid-cols-1 gap-3 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-4">
        <div className="min-h-[28rem] min-w-0 lg:min-h-0">
          <ProductGrid search={search} />
        </div>

        <div className="min-h-[22rem] lg:min-h-0">
          <Cart onPay={() => setShowPay(true)} />
        </div>
      </div>

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
