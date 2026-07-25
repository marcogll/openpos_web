import React from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  ArrowUpDown,
  ClipboardList,
  PackagePlus,
  History,
} from "lucide-react";
import { InventoryDashboard } from "./InventoryDashboard";
import { LowStockAlert } from "./LowStockAlert";
import { StockAdjust } from "./StockAdjust";
import { PhysicalCount } from "./PhysicalCount";
import { MerchandiseEntry } from "./MerchandiseEntry";
import { MovementHistory } from "./MovementHistory";

type Tab = "dashboard" | "low-stock" | "adjust" | "count" | "entry" | "history";

const TAB_CLASSES: Record<Tab, { active: string; inactive: string; icon: React.ElementType; label: string }> = {
  dashboard: {
    active: "bg-mauve/15 text-mauve ring-1 ring-mauve/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  "low-stock": {
    active: "bg-red/15 text-red ring-1 ring-red/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: AlertTriangle,
    label: "Bajo Stock",
  },
  adjust: {
    active: "bg-blue/15 text-blue ring-1 ring-blue/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: ArrowUpDown,
    label: "Ajuste Manual",
  },
  count: {
    active: "bg-amber/15 text-amber ring-1 ring-amber/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: ClipboardList,
    label: "Conteo Físico",
  },
  entry: {
    active: "bg-green/15 text-green ring-1 ring-green/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: PackagePlus,
    label: "Entrada Mercancía",
  },
  history: {
    active: "bg-cyan/15 text-cyan ring-1 ring-cyan/25",
    inactive: "text-text-muted hover:text-text-secondary hover:bg-bg-active",
    icon: History,
    label: "Historial",
  },
};

export function InventoryView() {
  const [active, setActive] = React.useState<Tab>("dashboard");

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return <InventoryDashboard />;
      case "low-stock":
        return <LowStockAlert onNavigate={setActive} />;
      case "adjust":
        return <StockAdjust />;
      case "count":
        return <PhysicalCount />;
      case "entry":
        return <MerchandiseEntry />;
      case "history":
        return <MovementHistory />;
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-bg-panel rounded-xl border border-bg-active p-1 flex-shrink-0">
        {(Object.keys(TAB_CLASSES) as Tab[]).map((tabId) => {
          const tab = TAB_CLASSES[tabId];
          const Icon = tab.icon;
          return (
            <button
              key={tabId}
              onClick={() => setActive(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                active === tabId ? tab.active : tab.inactive
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">{renderContent()}</div>
    </div>
  );
}
