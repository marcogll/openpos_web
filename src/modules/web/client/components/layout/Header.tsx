import React from "react";
import { Clock, Moon, ReceiptText, Search, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCartStore } from "../../stores/cartStore";
import { useUIStore } from "../../stores/uiStore";

export function Header() {
  const location = useLocation();
  const [time, setTime] = React.useState("");
  const ticketNum = useCartStore((s) => s.ticketNum);
  const itemCount = useCartStore((s) => s.itemCount());
  const total = useCartStore((s) => s.total());
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isPosRoute = location.pathname.startsWith("/pos");

  React.useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b app-chrome-line bg-card/85 px-3 pl-14 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-4">
      <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
        {isPosRoute ? (
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm font-semibold text-text-secondary">
            <ReceiptText className="h-4 w-4 text-primary" />
            Caja touch
          </div>
        ) : (
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Buscar producto</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
            <input
              type="search"
              placeholder="Buscar producto..."
              className="h-9 w-full rounded-lg border border-input bg-background/70 pl-9 pr-3 text-sm text-text-secondary transition-all placeholder:text-text-dim focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
          </label>
        )}
      </div>

      {/* Center: ticket info */}
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm lg:flex-none">
        <div className="flex min-w-0 items-center gap-2">
          <ReceiptText className="h-4 w-4 flex-shrink-0 text-primary lg:hidden" />
          <span className="hidden text-text-muted sm:inline">Ticket</span>
          <span className="data-value rounded-md bg-green/10 px-2 py-0.5 font-bold text-green">
            #{String(ticketNum).padStart(4, "0")}
          </span>
        </div>
        {itemCount > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="truncate text-text-secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="data-value hidden rounded-md bg-muted px-2 py-0.5 font-bold text-text-primary sm:block">
              ${total.toFixed(2)}
            </div>
          </>
        )}
      </div>

      {/* Right: theme toggle + clock */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          aria-label={themeMode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/50 text-text-dim transition-all hover:bg-accent hover:text-text-secondary cursor-pointer"
          title={themeMode === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {themeMode === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 text-sm text-text-muted">
          <Clock className="h-4 w-4" />
          <span className="data-value">{time}</span>
        </div>
      </div>
    </header>
  );
}
