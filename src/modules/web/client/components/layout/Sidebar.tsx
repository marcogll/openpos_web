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
    <>
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-screen flex-col border-r app-chrome-line bg-card/95 shadow-panel backdrop-blur transition-all duration-200 md:flex ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b app-chrome-line px-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
            <Scissors className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <div className="truncate text-sm font-bold text-text-primary">
                {storeName}
              </div>
              <div className="truncate text-[10px] font-medium uppercase text-text-dim">
                Caja y operaciones
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-accent/75 hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t app-chrome-line p-2">
          {!collapsed && user && (
            <div className="mb-1 rounded-lg bg-muted/60 px-3 py-2 animate-fade-in">
              <div className="truncate text-xs font-medium text-text-secondary">
                {user.name}
              </div>
              <div className="truncate text-[10px] uppercase text-text-dim">
                {user.role}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title={collapsed ? "Cerrar sesión" : undefined}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-red/10 hover:text-red cursor-pointer"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="absolute -right-3 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-all hover:bg-accent hover:text-foreground cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-6 border-t app-chrome-line bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-panel backdrop-blur md:hidden"
        aria-label="Navegación móvil"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
