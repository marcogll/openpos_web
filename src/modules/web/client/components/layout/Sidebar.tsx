import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  BarChart3,
  Gauge,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Scissors,
  Package,
  UsersRound,
  ReceiptText,
  FileCheck,
  ClipboardList,
  ScrollText,
  Banknote,
  CreditCard,
  History,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

type NavSubItem = { to: string; label: string; icon: React.ElementType };
type NavItem = { to?: string; icon?: React.ElementType; label: string; children?: NavSubItem[] };

const NAV_ITEMS: (NavItem | { to: string; icon: React.ElementType; label: string })[] = [
  { to: "/pos", icon: ShoppingCart, label: "Punto de Venta" },
  {
    label: "Inventario",
    icon: Package,
    children: [
      { to: "/inventory", label: "Dashboard", icon: ClipboardList },
      { to: "/inventory/management", label: "Gestión", icon: Package },
      { to: "/inventory/audit", label: "Auditoría", icon: ScrollText },
    ],
  },
  {
    label: "Caja",
    icon: Banknote,
    children: [
      { to: "/cash/sales", label: "Ventas", icon: ReceiptText },
      { to: "/cash/register", label: "Corte de Caja", icon: Banknote },
      { to: "/cash/cuts", label: "Corte Tarjeta/Transf.", icon: CreditCard },
    ],
  },
  { to: "/clients", icon: UsersRound, label: "Clientes" },
  { to: "/settings/ventas", icon: ReceiptText, label: "Ventas" },
  { to: "/comprobantes", icon: FileCheck, label: "Comprobantes" },
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(["Inventario", "Caja"]));

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
    setMobileOpen(false);
    navigate("/login");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-3 top-2 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-card transition-colors active:bg-primary/90 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

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
        <nav className="flex-1 space-y-1 px-2 py-3 overflow-auto" aria-label="Navegación principal">
          {NAV_ITEMS.map((item: any) => {
            if (item.children) {
              const isActive = item.children.some((c: any) =>
                typeof window !== "undefined" && window.location.pathname.startsWith(c.to)
              );
              return (
                <div key={item.label}>
                  <button
                    onClick={() => !collapsed && setExpandedSections(prev => {
                      const next = new Set(prev);
                      if (next.has(item.label)) next.delete(item.label); else next.add(item.label);
                      return next;
                    })}
                    className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent/75 hover:text-foreground"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.has(item.label) ? "" : "-rotate-90"}`} />
                      </>
                    )}
                  </button>
                  {!collapsed && expandedSections.has(item.label) && (
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-primary/20 pl-2">
                      {item.children.map((sub: any) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          end
                          aria-label={sub.label}
                          className={({ isActive }) =>
                            `flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            }`
                          }
                        >
                          <sub.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/settings"}
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
            );
          })}
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

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú principal">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[18rem] max-w-[82vw] flex-col border-r app-chrome-line bg-card shadow-panel">
            <div className="flex h-14 items-center justify-between gap-3 border-b app-chrome-line px-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
                  <Scissors className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-text-primary">{storeName}</div>
                  <div className="truncate text-[10px] font-medium uppercase text-text-dim">
                    Caja y operaciones
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Cerrar menú"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-auto px-3 py-4" aria-label="Navegación móvil">
              {NAV_ITEMS.map((item: any) => {
                if (item.children) {
                  return (
                    <div key={item.label}>
                      <div className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-bold text-muted-foreground">
                        {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                        <span>{item.label}</span>
                      </div>
                      <div className="ml-4 space-y-0.5">
                        {item.children.map((sub: any) => (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            end
                            onClick={closeMobile}
                            aria-label={sub.label}
                            className={({ isActive }) =>
                              `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                isActive
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:bg-accent/75 hover:text-foreground"
                              }`
                            }
                          >
                            <sub.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/settings"}
                    onClick={closeMobile}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-bold transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "text-muted-foreground hover:bg-accent/75 hover:text-foreground"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t app-chrome-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {user && (
                <div className="mb-2 rounded-lg bg-muted/60 px-3 py-2">
                  <div className="truncate text-xs font-medium text-text-secondary">{user.name}</div>
                  <div className="truncate text-[10px] uppercase text-text-dim">{user.role}</div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-red/10 hover:text-red"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                Salir
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
