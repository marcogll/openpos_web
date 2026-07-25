import React from "react";
import { CreditCard, PackageSearch, ReceiptText, ScanLine } from "lucide-react";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { SearchBar } from "./SearchBar";
import { PayModal } from "./PayModal";
import { useCartStore } from "../../stores/cartStore";
import { Button } from "../ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";

export function PosView() {
  const [search, setSearch] = React.useState("");
  const [showPay, setShowPay] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState<"products" | "ticket">("products");
  const itemCount = useCartStore((s) => s.itemCount());
  const total = useCartStore((s) => s.total());

  return (
    <div className="flex min-h-full flex-col gap-2 pb-3 animate-fade-in sm:gap-3 lg:gap-4 lg:pb-0">
      <div className="hidden rounded-lg border app-chrome-line bg-card/85 px-4 py-3 shadow-card backdrop-blur sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ScanLine className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">Punto de venta</h1>
            <p className="text-sm text-muted-foreground">
              Toca un producto, revisa el ticket y cobra.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/70 px-3 py-2 text-sm font-bold text-muted-foreground">
          {itemCount} {itemCount === 1 ? "producto" : "productos"} en ticket
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-2 bg-background/95 px-2 pb-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
        <Tabs value={mobilePanel} onValueChange={(value) => setMobilePanel(value as "products" | "ticket")} className="mb-2 xl:hidden">
          <TabsList aria-label="Vista de caja" className="grid-cols-2 border border-border/70 bg-card/80">
            <TabsTrigger value="products">
              <PackageSearch className="h-4 w-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="ticket">
              <ReceiptText className="h-4 w-4" />
              Ticket ({itemCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="grid flex-1 grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_27rem] xl:gap-4">
        <div className={`min-w-0 xl:block ${mobilePanel === "products" ? "block" : "hidden"}`}>
          <ProductGrid search={search} />
        </div>

        <div className={`min-h-[calc(100dvh-12rem)] xl:sticky xl:top-4 xl:block xl:max-h-[calc(100dvh-7.5rem)] ${mobilePanel === "ticket" ? "block" : "hidden"}`}>
          <Cart onPay={() => setShowPay(true)} />
        </div>
      </div>

      {mobilePanel === "products" && itemCount > 0 && (
        <div className="sticky bottom-2 z-30 -mx-1 rounded-lg border border-green/40 bg-card/95 p-2 shadow-panel backdrop-blur sm:hidden">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button
              variant="secondary"
              size="touch"
              onClick={() => setMobilePanel("ticket")}
              className="min-h-14 justify-between px-3 text-left"
            >
              <span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
                </span>
                <span className="data-value block text-xl font-extrabold text-green">
                  ${total.toFixed(2)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-primary">
                <ReceiptText className="h-4 w-4" />
                Ticket
              </span>
            </Button>
            <Button
              variant="success"
              size="touch"
              onClick={() => setShowPay(true)}
              className="min-h-14 px-4 text-sm font-extrabold"
            >
              <CreditCard className="h-5 w-5" />
              Cobrar
            </Button>
          </div>
        </div>
      )}

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
