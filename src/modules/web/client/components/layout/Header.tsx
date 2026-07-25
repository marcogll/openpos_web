import React from "react";
import { Search, Clock, Sun, Moon } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { useUIStore } from "../../stores/uiStore";

export function Header() {
  const [time, setTime] = React.useState("");
  const ticketNum = useCartStore((s) => s.ticketNum);
  const itemCount = useCartStore((s) => s.itemCount());
  const total = useCartStore((s) => s.total());
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setTheme = useUIStore((s) => s.setTheme);

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
    <header className="h-14 bg-card/85 border-b border-border/70 flex items-center justify-between px-4 flex-shrink-0 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      {/* Left: search placeholder */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="search"
            placeholder="Buscar producto..."
            className="w-64 h-9 pl-9 pr-3 rounded-lg bg-background/70 border border-input text-sm text-text-secondary placeholder:text-text-dim focus:border-ring focus:ring-2 focus:ring-ring/15 transition-all"
          />
        </div>
      </div>

      {/* Center: ticket info */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Ticket</span>
          <span className="font-bold text-green font-mono rounded-md bg-green/10 px-2 py-0.5">
            #{String(ticketNum).padStart(4, "0")}
          </span>
        </div>
        {itemCount > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="text-text-secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="font-bold text-text-primary rounded-md bg-muted px-2 py-0.5">
              ${total.toFixed(2)}
            </div>
          </>
        )}
      </div>

      {/* Right: theme toggle + clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg border border-border/70 bg-background/50 flex items-center justify-center text-text-dim hover:text-text-secondary hover:bg-accent transition-all cursor-pointer"
          title={theme === "mocha" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "mocha" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-sm text-text-muted">
          <Clock className="w-4 h-4" />
          <span className="font-mono">{time}</span>
        </div>
      </div>
    </header>
  );
}
