import React from "react";
import {
  X,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  QrCode,
  Check,
  Download,
  Receipt,
  Printer,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

type Props = {
  onClose: () => void;
  onConfirm: () => void;
};

type Method = "efectivo" | "tarjeta" | "transf." | "qr/codi";
type Step = "method" | "cash" | "receipt";
type ReceiptDelivery = "digital" | "ticket" | "printed" | "comprobante-digital";

type CompletedSale = {
  ticket: string;
  items: {
    sku: string;
    name: string;
    price: number;
    qty: number;
    unitType?: string;
    unit_type?: string;
  }[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  received: number;
  change: number;
  method: string;
  createdAt?: string;
  created_at?: string;
  createdBy?: string;
  created_by?: string;
  customerEmail?: string | null;
  customer_email?: string | null;
};

type GeneratedReceipt = {
  html: string;
  text: string;
  filename: string;
  whatsappUrl: string;
  mailtoUrl: string;
};

type ReceiptConfig = {
  promptOnSale: boolean;
  defaultDelivery: ReceiptDelivery;
  printerEnabled: boolean;
  printerWidth: number;
};

const METHODS: { id: Method; icon: React.ElementType; label: string }[] = [
  { id: "efectivo", icon: Banknote, label: "Efectivo" },
  { id: "tarjeta", icon: CreditCard, label: "Tarjeta" },
  { id: "transf.", icon: ArrowRightLeft, label: "Transferencia" },
  { id: "qr/codi", icon: QrCode, label: "CoDi / QR" },
];

const RECEIPT_OPTIONS: {
  id: ReceiptDelivery;
  icon: React.ElementType;
  label: string;
  description: string;
}[] = [
  { id: "printed", icon: Printer, label: "Ticket B/N", description: "Imprimir el mismo formato en blanco y negro" },
  { id: "comprobante-digital", icon: Mail, label: "Enviar digital", description: "Webhook/correo con recibo HTML" },
  { id: "digital", icon: Download, label: "Descargar HTML", description: "Archivo listo para WhatsApp manual" },
  { id: "ticket", icon: Receipt, label: "Ticket", description: "Guardar venta sin imprimir" },
];

const METHOD_STYLES: Record<
  Method,
  { ring: string; bg: string; icon: string; text: string; check: string }
> = {
  efectivo: {
    ring: "border-mauve/50 bg-mauve/10",
    bg: "bg-mauve/20",
    icon: "text-mauve",
    text: "text-mauve",
    check: "text-mauve",
  },
  tarjeta: {
    ring: "border-blue/50 bg-blue/10",
    bg: "bg-blue/20",
    icon: "text-blue",
    text: "text-blue",
    check: "text-blue",
  },
  "transf.": {
    ring: "border-teal/50 bg-teal/10",
    bg: "bg-teal/20",
    icon: "text-teal",
    text: "text-teal",
    check: "text-teal",
  },
  "qr/codi": {
    ring: "border-peach/50 bg-peach/10",
    bg: "bg-peach/20",
    icon: "text-peach",
    text: "text-peach",
    check: "text-peach",
  },
};

export function PayModal({ onClose, onConfirm }: Props) {
  const total = useCartStore((s) => s.total());
  const items = useCartStore((s) => s.items);
  const ticketNum = useCartStore((s) => s.ticketNum);
  const nextTicket = useCartStore((s) => s.nextTicket);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const [step, setStep] = React.useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = React.useState(0);
  const [selectedReceipt, setSelectedReceipt] = React.useState(0);
  const [received, setReceived] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [completedSale, setCompletedSale] = React.useState<CompletedSale | null>(null);
  const [receiptConfig, setReceiptConfig] = React.useState<ReceiptConfig>({
    promptOnSale: true,
    defaultDelivery: "printed",
    printerEnabled: true,
    printerWidth: 58,
  });

  const rec = parseFloat(received) || 0;
  const change = Math.max(0, rec - total);
  const ready = rec >= total;

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setReceiptConfig({
          promptOnSale: data.receiptPromptOnSale !== "false",
          defaultDelivery: isReceiptDelivery(data.receiptDefaultDelivery)
            ? data.receiptDefaultDelivery
            : "printed",
          printerEnabled: data.printerEnabled !== "false",
          printerWidth: Number(data.printerWidth) || 58,
        });
      })
      .catch(() => {});
  }, []);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const method = METHODS[selectedMethod].id;
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: `#${String(ticketNum).padStart(4, "0")}`,
          items: items.map((i) => ({
            sku: i.sku,
            name: i.name,
            price: i.price,
            qty: i.qty,
            unitType: i.unitType,
          })),
          subtotal: useCartStore.getState().subtotal(),
          tax: useCartStore.getState().tax(),
          total,
          method,
          received: method === "efectivo" ? rec : total,
          change: method === "efectivo" ? change : 0,
          createdBy: user?.name || "Cajero",
        }),
      });
      if (res.ok) {
        const sale = (await res.json().catch(() => null)) as CompletedSale | null;
        if (!sale) {
          addToast("Venta registrada sin respuesta de ticket", "warning");
          nextTicket();
          onConfirm();
          return;
        }

        setCompletedSale(sale);
        nextTicket();
        addToast(`Venta ${sale.ticket || `#${String(ticketNum).padStart(4, "0")}`} completada`, "success");

        if (receiptConfig.promptOnSale) {
          const defaultIndex = RECEIPT_OPTIONS.findIndex((option) => option.id === receiptConfig.defaultDelivery);
          setSelectedReceipt(defaultIndex >= 0 ? defaultIndex : 0);
          setStep("receipt");
        } else {
          handleReceiptDelivery(receiptConfig.defaultDelivery, sale);
        }
      } else {
        addToast("Error al procesar venta", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setProcessing(false);
    }
  };

  const finishSale = () => {
    onConfirm();
  };

  const handleReceiptDelivery = async (delivery: ReceiptDelivery, sale = completedSale) => {
    if (!sale) return;

    if (delivery === "printed") {
      if (!receiptConfig.printerEnabled) {
        addToast("La impresora está desactivada en configuración", "warning");
      } else {
        try {
          await printReceipt(sale);
          addToast("Ticket B/N enviado a impresión", "success");
        } catch {
          addToast("Error al generar ticket para impresión", "error");
        }
      }
      finishSale();
      return;
    }

    if (delivery === "comprobante-digital") {
      sendComprobanteDigital(sale);
      return;
    }

    if (delivery === "digital") {
      try {
        await downloadReceipt(sale);
        addToast("Recibo HTML descargado", "success");
      } catch {
        addToast("Error al descargar recibo", "error");
      }
      finishSale();
      return;
    }

    addToast(`Ticket ${sale.ticket} guardado`, "success");
    finishSale();
  };

  const sendComprobanteDigital = async (sale: CompletedSale) => {
    try {
      const res = await fetch("/api/receipts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: sale.ticket,
          deliveryMethod: "comprobante-digital",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.webhookStatus === "sent") {
          addToast("Comprobante enviado a n8n correctamente", "success");
        } else if (data.webhookStatus === "skipped") {
          addToast("Comprobante guardado (webhook no configurado)", "warning");
        } else {
          addToast("Error al enviar a n8n", "error");
        }
        if (data.receipt?.whatsappUrl) {
          window.open(data.receipt.whatsappUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        addToast("Error al generar comprobante", "error");
      }
    } catch {
      addToast("Error de conexión al generar comprobante", "error");
    }
    finishSale();
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (step === "receipt") {
        if (e.key === "ArrowUp")
          setSelectedReceipt((m) => Math.max(0, m - 1));
        if (e.key === "ArrowDown")
          setSelectedReceipt((m) => Math.min(RECEIPT_OPTIONS.length - 1, m + 1));
        if (e.key === "Enter") {
          handleReceiptDelivery(RECEIPT_OPTIONS[selectedReceipt].id);
        }
        return;
      }
      if (step === "method") {
        if (e.key === "ArrowUp")
          setSelectedMethod((m) => Math.max(0, m - 1));
        if (e.key === "ArrowDown")
          setSelectedMethod((m) => Math.min(METHODS.length - 1, m + 1));
        if (e.key === "Enter") {
          if (METHODS[selectedMethod].id === "efectivo") {
            setStep("cash");
          } else {
            handleConfirm();
          }
        }
      }
      if (step === "cash") {
        if (e.key === "Enter" && ready) handleConfirm();
        if (e.key >= "0" && e.key <= "9")
          setReceived((r) => r + e.key);
        if (e.key === "Backspace") setReceived((r) => r.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl border border-border/70 w-[480px] max-h-[90vh] overflow-hidden animate-scale-in shadow-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-muted/40">
          <h2 className="text-lg font-bold text-text-primary">
            {step === "method" && "Método de Pago"}
            {step === "cash" && "Efectivo"}
            {step === "receipt" && "Comprobante"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total */}
        <div className="px-6 py-5 text-center border-b border-border/50">
          <div className="text-sm text-text-muted">Total a cobrar</div>
          <div className="text-3xl font-bold text-green mt-1 tabular-nums">
            ${total.toFixed(2)}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "method" && (
            <div className="space-y-2">
              {METHODS.map((m, i) => {
                const styles = METHOD_STYLES[m.id];
                const selected = i === selectedMethod;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMethod(i);
                      if (m.id === "efectivo") {
                        setStep("cash");
                      } else {
                        handleConfirm();
                      }
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      selected
                        ? styles.ring
                        : "border-border/70 hover:border-primary/30 hover:bg-accent/55"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selected ? `${styles.bg} ${styles.icon}` : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div
                        className={`font-semibold ${
                          selected ? styles.text : "text-text-primary"
                        }`}
                      >
                        {m.label}
                      </div>
                    </div>
                    {selected && (
                      <Check className={`w-5 h-5 ${styles.check} ml-auto`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step === "cash" && (
            <div className="space-y-4">
              {/* Amount display */}
              <div className="text-center">
                <div className="text-sm text-text-muted mb-1">Recibido</div>
                <div className="text-4xl font-bold text-text-primary font-mono tabular-nums">
                  ${rec.toFixed(2)}
                  <span className="animate-pulse-slow text-green">|</span>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setReceived(String(amt))}
                    className="py-2 rounded-lg bg-muted border border-border/70 text-sm font-medium text-text-secondary hover:bg-accent hover:text-text-primary transition-all cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Change / Missing */}
              <div
                className={`p-3 rounded-xl text-center ${
                  ready
                    ? "bg-green/10 border border-green/30"
                    : "bg-amber/10 border border-amber/30"
                }`}
              >
                {ready ? (
                  <>
                    <div className="text-sm text-green/70">Cambio</div>
                    <div className="text-2xl font-bold text-green">
                      ${change.toFixed(2)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-amber/70">Falta</div>
                    <div className="text-2xl font-bold text-amber">
                      ${(total - rec).toFixed(2)}
                    </div>
                  </>
                )}
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={!ready || processing}
                className="w-full h-12 rounded-xl bg-green text-bg font-bold text-sm flex items-center justify-center gap-2 shadow-card hover:bg-green-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                ) : (
                  <>
                    Confirmar Venta
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === "receipt" && completedSale && (
            <div className="space-y-4">
              <div className="rounded-xl border border-green/30 bg-green/10 p-4">
                <div className="text-sm text-green/80">Venta registrada</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-green">{completedSale.ticket}</span>
                  <span className="text-xl font-bold text-green">${Number(completedSale.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {RECEIPT_OPTIONS.map((option, i) => {
                  const selected = i === selectedReceipt;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedReceipt(i);
                        void handleReceiptDelivery(option.id);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        selected
                          ? "border-mauve/50 bg-mauve/10"
                          : "border-border/70 hover:border-primary/30 hover:bg-accent/55"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selected ? "bg-mauve/20 text-mauve" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className={`font-semibold ${selected ? "text-mauve" : "text-text-primary"}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-text-dim">{option.description}</div>
                      </div>
                      {option.id === "digital" && <MessageCircle className="ml-auto h-4 w-4 text-text-dim" />}
                      {selected && <Check className="w-5 h-5 text-mauve ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-6 py-3 border-t border-border/70 bg-muted/35 text-center">
          <span className="text-xs text-text-dim">
            {step === "method" && "↑↓ seleccionar · Enter confirmar · Esc cerrar"}
            {step === "cash" && "0-9 ingresar monto · Enter confirmar · Esc volver"}
            {step === "receipt" && "↑↓ seleccionar · Enter entregar comprobante"}
          </span>
        </div>

      </div>
    </div>
  );
}

function isReceiptDelivery(value: unknown): value is ReceiptDelivery {
  return value === "digital" || value === "ticket" || value === "printed" || value === "comprobante-digital";
}

async function generateReceipt(sale: CompletedSale, deliveryMethod: ReceiptDelivery): Promise<GeneratedReceipt> {
  const res = await fetch("/api/receipts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticket: sale.ticket,
      deliveryMethod,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.receipt?.html) {
    throw new Error("No se pudo generar el recibo");
  }
  return data.receipt as GeneratedReceipt;
}

async function downloadReceipt(sale: CompletedSale) {
  const receipt = await generateReceipt(sale, "digital");
  const blob = new Blob([receipt.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receipt.filename || `${sale.ticket || "ticket"}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.open(receipt.whatsappUrl, "_blank", "noopener,noreferrer");
}

async function printReceipt(sale: CompletedSale) {
  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) {
    window.print();
    return;
  }

  const receipt = await generateReceipt(sale, "printed");
  win.document.write(receipt.html);
  win.document.close();
  win.focus();
  win.print();
}
