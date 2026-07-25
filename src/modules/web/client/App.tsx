import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { Layout } from "./components/layout/Layout";
import { LoginScreen } from "./components/auth/LoginScreen";
import { SetupScreen } from "./components/auth/SetupScreen";
import { LoadingSpinner } from "./components/layout/LoadingSpinner";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AlertCircle, Home } from "lucide-react";

const PosView = lazy(() =>
  import("./components/pos/PosView").then((m) => ({ default: m.PosView }))
);
const ReportsView = lazy(() =>
  import("./components/reports/ReportsView").then((m) => ({ default: m.default }))
);
const KPIView = lazy(() =>
  import("./components/reports/KPIView").then((m) => ({ default: m.default }))
);
const SettingsView = lazy(() =>
  import("./components/settings/SettingsView").then((m) => ({ default: m.SettingsView }))
);
const InventoryView = lazy(() =>
  import("./components/inventory/InventoryView").then((m) => ({ default: m.InventoryView }))
);
const ClientsView = lazy(() =>
  import("./components/clients/ClientsView").then((m) => ({ default: m.ClientsView }))
);

function useNeedsSetup() {
  const [needsSetup, setNeedsSetup] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((data) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  return needsSetup;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
      <div className="bg-bg-panel rounded-2xl border border-bg-active p-8 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">
          Ruta no encontrada
        </h2>
        <p className="text-sm text-text-muted mb-6">
          La ruta que buscas no existe o no está disponible.
        </p>
        <Link
          to="/pos"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Home className="w-4 h-4" />
          Ir a Punto de Venta
        </Link>
      </div>
    </div>
  );
}

export function App() {
  const needsSetup = useNeedsSetup();

  if (needsSetup === null) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {needsSetup ? (
          <>
            <Route path="/setup" element={<SetupScreen />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/pos" replace />} />
                          <Route path="/pos" element={<PosView />} />
                          <Route path="/inventory" element={<InventoryView />} />
                          <Route path="/clients" element={<ClientsView />} />
                          <Route path="/reports" element={<ReportsView />} />
                          <Route path="/kpis" element={<KPIView />} />
                          <Route path="/settings" element={<SettingsView />} />
                          <Route path="/settings/:section" element={<SettingsView />} />
                          <Route path="/settings-:section" element={<SettingsView />} />
                          <Route path="/settings-clients" element={<SettingsView />} />
                          <Route path="/settings-client" element={<SettingsView />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
