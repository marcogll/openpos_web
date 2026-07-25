import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  BarChart3,
  Gauge,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Package,
  UsersRound,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

const NAV_ITEMS = [
  { to: "/pos", icon: ShoppingCart, label: "Punto de Venta" },
  { to: "/inventory", icon: Package, label: "Inventario" },
  { to: "/clients", icon: UsersRound, label: "Clientes" },
  { to: "/reports", icon: BarChart3, label: "Reportes" },
  { to: "/kpis", icon: Gauge, label: "KPIs" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [storeName, setStoreName] = React.useState("Vanity POS");

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.storeName) setStoreName(data.storeName);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card/95 border-r border-border/70 flex flex-col z-30 transition-all duration-200 shadow-panel backdrop-blur ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-3 border-b border-border/70">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-card flex items-center justify-center flex-shrink-0">
          <Scissors className="w-4 h-4" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">
              {storeName}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-border/70 p-2">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1 rounded-lg bg-muted/60 animate-fade-in">
            <div className="text-xs font-medium text-text-secondary truncate">
              {user.name}
            </div>
            <div className="text-[10px] text-text-dim uppercase">
              {user.role}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red hover:bg-red/10 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
