import React from "react";
import { Code2, Copy, KeyRound, ShieldCheck, TerminalSquare } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

const BASE_URL = "/api";

type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth?: string;
  body?: string;
};

const ENDPOINTS: { title: string; endpoints: Endpoint[] }[] = [
  {
    title: "Autenticación",
    endpoints: [
      { method: "GET", path: "/auth/setup", description: "Consulta si el POS necesita crear el primer usuario.", auth: "Público" },
      { method: "POST", path: "/auth/login", description: "Inicia sesión con usuario y PIN. Devuelve token JWT.", auth: "Público", body: '{ "username": "admin", "pin": "1234" }' },
      { method: "GET", path: "/auth/me", description: "Devuelve el usuario autenticado actual.", auth: "Bearer token" },
    ],
  },
  {
    title: "Productos",
    endpoints: [
      { method: "GET", path: "/products?q=labial&limit=20", description: "Lista productos activos con búsqueda y paginación.", auth: "Bearer token" },
      { method: "GET", path: "/products/:sku", description: "Consulta un producto por SKU.", auth: "Bearer token" },
      { method: "POST", path: "/products", description: "Crea un producto.", auth: "Admin", body: '{ "sku": "SKU001", "name": "Producto", "price": 99, "stock": 10 }' },
      { method: "PUT", path: "/products/:sku", description: "Actualiza un producto existente.", auth: "Admin" },
      { method: "DELETE", path: "/products/:sku", description: "Desactiva un producto.", auth: "Admin" },
    ],
  },
  {
    title: "Ventas",
    endpoints: [
      { method: "GET", path: "/sales?limit=50", description: "Lista ventas recientes.", auth: "Bearer token" },
      { method: "GET", path: "/sales/:ticket", description: "Consulta una venta por ticket.", auth: "Bearer token" },
      { method: "POST", path: "/sales", description: "Crea una venta y descuenta inventario.", auth: "Bearer token", body: '{ "method": "cash", "items": [{ "sku": "SKU001", "qty": 1 }], "received": 150 }' },
      { method: "POST", path: "/receipts/generate", description: "Genera comprobante digital y dispara webhook si está configurado.", auth: "Bearer token", body: '{ "ticket": "T000001", "deliveryMethod": "comprobante-digital" }' },
    ],
  },
  {
    title: "Clientes",
    endpoints: [
      { method: "GET", path: "/clients?q=RFC", description: "Lista o busca clientes.", auth: "Bearer token" },
      { method: "GET", path: "/clients/:rfc", description: "Consulta un cliente por RFC.", auth: "Bearer token" },
      { method: "POST", path: "/clients", description: "Crea un cliente.", auth: "Admin" },
      { method: "PUT", path: "/clients/:rfc", description: "Actualiza un cliente.", auth: "Admin" },
      { method: "DELETE", path: "/clients/:rfc", description: "Elimina un cliente.", auth: "Admin" },
    ],
  },
  {
    title: "Inventario y Reportes",
    endpoints: [
      { method: "GET", path: "/inventory/dashboard", description: "Resumen de inventario.", auth: "Bearer token" },
      { method: "GET", path: "/inventory/low-stock", description: "Productos debajo del mínimo.", auth: "Bearer token" },
      { method: "POST", path: "/inventory/entry", description: "Registra entrada de mercancía.", auth: "Admin" },
      { method: "POST", path: "/inventory/adjustment", description: "Ajusta existencia de un SKU.", auth: "Admin" },
      { method: "GET", path: "/reports/daily", description: "Reporte diario.", auth: "Bearer token" },
      { method: "GET", path: "/reports/products", description: "Reporte por productos.", auth: "Bearer token" },
    ],
  },
  {
    title: "Configuración e Importación",
    endpoints: [
      { method: "GET", path: "/config", description: "Lee la configuración del POS.", auth: "Bearer token" },
      { method: "PUT", path: "/config", description: "Actualiza varias claves de configuración.", auth: "Admin" },
      { method: "POST", path: "/import/products", description: "Importa productos desde CSV procesado.", auth: "Bearer token" },
      { method: "POST", path: "/import/clients", description: "Importa clientes.", auth: "Bearer token" },
      { method: "POST", path: "/import/sales", description: "Importa ventas históricas.", auth: "Bearer token" },
    ],
  },
  {
    title: "Telegram",
    endpoints: [
      { method: "POST", path: "/telegram/webhook", description: "Recibe updates del bot de Telegram.", auth: "Secreto opcional" },
      { method: "POST", path: "/telegram/webhook/:secret", description: "Recibe updates validando TELEGRAM_WEBHOOK_SECRET en la URL.", auth: "Webhook secret" },
      { method: "POST", path: "/telegram/webhook", description: "También acepta el secreto en X-Telegram-Bot-Api-Secret-Token.", auth: "Header secret" },
    ],
  },
];

export function ApiReference() {
  const addToast = useUIStore((s) => s.addToast);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    addToast("Copiado", "success");
  };

  const curlExample = `curl -H "Authorization: Bearer TOKEN" ${window.location.origin}${BASE_URL}/products`;
  const telegramWebhookUrl = `${window.location.origin}${BASE_URL}/telegram/webhook/SECRET`;

  return (
    <div className="space-y-4">
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
          <Code2 className="w-5 h-5 text-mauve" />
          <h3 className="text-base font-bold text-text-primary">API Ref del POS</h3>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-5">
          <div className="space-y-3">
            <div className="rounded-lg border border-bg-active bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-text-dim font-medium">Base URL</div>
                  <code className="text-sm text-text-primary">{window.location.origin}{BASE_URL}</code>
                </div>
                <button
                  type="button"
                  onClick={() => copy(`${window.location.origin}${BASE_URL}`)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-bg-active text-text-secondary hover:text-text-primary"
                  title="Copiar Base URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-bg-active bg-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TerminalSquare className="w-4 h-4 text-green" />
                <div className="text-xs uppercase tracking-wider text-text-dim font-medium">Ejemplo</div>
              </div>
              <code className="block text-xs text-text-secondary whitespace-pre-wrap break-all">{curlExample}</code>
            </div>

            <div className="rounded-lg border border-bg-active bg-bg p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-4 h-4 text-blue" />
                  <div className="text-xs uppercase tracking-wider text-text-dim font-medium">Webhook Telegram</div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(telegramWebhookUrl)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-bg-active text-text-secondary hover:text-text-primary"
                  title="Copiar webhook Telegram"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="block text-xs text-text-secondary whitespace-pre-wrap break-all">{telegramWebhookUrl}</code>
            </div>
          </div>

          <div className="rounded-lg border border-bg-active bg-bg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-blue" />
              <div className="text-sm font-bold text-text-primary">Autorización</div>
            </div>
            <p className="text-sm text-text-muted">
              En rutas protegidas envía el token JWT en el header Authorization como Bearer token.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-dim">
              <KeyRound className="w-3.5 h-3.5" />
              Admin requerido para crear, editar o eliminar datos sensibles.
            </div>
            <div className="mt-3 text-xs text-text-dim">
              Telegram se configura desde Settings / Telegram; si está vacío usa TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-3 border-b border-bg-active">
          <h4 className="text-sm font-bold text-text-primary">Comandos Telegram</h4>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["/ayuda", "Muestra comandos disponibles."],
            ["/consulta", "Activa búsqueda de productos por nombre, SKU o código."],
            ["/consulta LABIAL", "Busca productos directamente."],
            ["/update", "Activa actualización de stock por texto."],
            ["SKU001 10", "Ejemplo de conteo para actualizar stock."],
            ["/cancelar", "Sale del modo actual."],
          ].map(([command, description]) => (
            <div key={command} className="rounded-lg border border-bg-active bg-bg p-3">
              <code className="text-sm text-text-primary">{command}</code>
              <p className="text-xs text-text-muted mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {ENDPOINTS.map((group) => (
        <div key={group.title} className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
          <div className="px-6 py-3 border-b border-bg-active">
            <h4 className="text-sm font-bold text-text-primary">{group.title}</h4>
          </div>
          <div className="divide-y divide-bg-active">
            {group.endpoints.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <MethodBadge method={endpoint.method} />
                  <code className="text-sm text-text-primary">{endpoint.path}</code>
                  <span className="text-xs text-text-dim">{endpoint.auth}</span>
                </div>
                <p className="text-sm text-text-muted mt-2">{endpoint.description}</p>
                {endpoint.body && (
                  <code className="block mt-2 text-xs text-text-secondary bg-bg rounded-lg border border-bg-active p-3 whitespace-pre-wrap">
                    {endpoint.body}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MethodBadge({ method }: { method: Endpoint["method"] }) {
  const colors: Record<Endpoint["method"], string> = {
    GET: "bg-green/10 text-green",
    POST: "bg-blue/10 text-blue",
    PUT: "bg-amber/10 text-amber",
    DELETE: "bg-red/10 text-red",
  };

  return (
    <span className={`w-16 text-center rounded px-2 py-1 text-xs font-bold ${colors[method]}`}>
      {method}
    </span>
  );
}
