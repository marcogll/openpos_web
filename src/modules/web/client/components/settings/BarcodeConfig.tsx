import React from "react";
import { QrCode, Bluetooth, Printer, Save, Search, Package, CheckCircle } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import QRCode from "qrcode";

type ScannerType = "1d-barcode" | "2d-qr" | "2d-data-matrix" | "2d-pdf417";

type BarcodeConfigData = {
  scannerEnabled: boolean;
  scannerType: ScannerType;
  scannerSensitivity: "low" | "medium" | "high";
  beepOnScan: boolean;
  ledOnScan: boolean;
  autoEnterAfterScan: boolean;
  minBarcodeLength: number;
  prefix: string;
  suffix: string;
};

const SCANNER_TYPES: { value: ScannerType; label: string; desc: string }[] = [
  { value: "1d-barcode", label: "Código de Barras 1D", desc: "EAN-13, Code 128, UPC" },
  { value: "2d-qr", label: "QR Code", desc: "Códigos cuadrados con información" },
  { value: "2d-data-matrix", label: "Data Matrix", desc: "Códigos 2D de alta densidad" },
  { value: "2d-pdf417", label: "PDF417", desc: "Usado en credenciales y boletos" },
];

const SENSITIVITY_OPTIONS = [
  { value: "low" as const, label: "Baja", desc: "Solo escáneres rápidos (recommended)" },
  { value: "medium" as const, label: "Media", desc: "Velocidad intermedia" },
  { value: "high" as const, label: "Alta", desc: "Acepta escritura más lenta" },
];

const DEFAULT_CONFIG: BarcodeConfigData = {
  scannerEnabled: true,
  scannerType: "1d-barcode",
  scannerSensitivity: "low",
  beepOnScan: true,
  ledOnScan: true,
  autoEnterAfterScan: true,
  minBarcodeLength: 3,
  prefix: "",
  suffix: "",
};

const CATEGORY_LABELS: Record<string, string> = {
  MAQ: "Maquillaje",
  CFA: "Cuidado Facial",
  CAB: "Cabello",
  UNA: "Uñas",
  SPA: "Spa/Tratamientos",
  HER: "Herramientas",
  ACC: "Accesorios",
  SER: "Servicios",
};

const normalizeProduct = (product: any) => ({
  ...product,
  sku: product.sku || "",
  name: product.name || "",
  price: Number(product.price ?? 0),
  category: product.category || "GEN",
  barcode: product.barcode || "",
});

export function BarcodeConfig() {
  const addToast = useUIStore((s) => s.addToast);
  const [config, setConfig] = React.useState<BarcodeConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testMode, setTestMode] = React.useState(false);
  const [lastScan, setLastScan] = React.useState<string | null>(null);

  // QR Label printer state
  const [products, setProducts] = React.useState<any[]>([]);
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
  const [qrImageUrl, setQrImageUrl] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          scannerEnabled: data.scannerEnabled !== "false",
          scannerType: isScannerType(data.scannerType) ? data.scannerType : DEFAULT_CONFIG.scannerType,
          scannerSensitivity: isSensitivity(data.scannerSensitivity) ? data.scannerSensitivity : DEFAULT_CONFIG.scannerSensitivity,
          beepOnScan: data.beepOnScan !== "false",
          ledOnScan: data.ledOnScan !== "false",
          autoEnterAfterScan: data.autoEnterAfterScan !== "false",
          minBarcodeLength: Number(data.minBarcodeLength) || DEFAULT_CONFIG.minBarcodeLength,
          prefix: data.prefix || "",
          suffix: data.suffix || "",
        });
      })
      .catch(() => addToast("Error al cargar configuración", "error"))
      .finally(() => setLoading(false));

    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        setProducts(list.map(normalizeProduct));
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (selectedProduct) {
      const qrData = JSON.stringify({
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        price: selectedProduct.price,
        category: selectedProduct.category,
        barcode: selectedProduct.barcode,
      });

      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrImageUrl)
        .catch(() => setQrImageUrl(null));
    }
  }, [selectedProduct]);

  const set = <K extends keyof BarcodeConfigData>(key: K, value: BarcodeConfigData[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        addToast("Configuración de escáner guardada", "success");
      } else {
        addToast("Error al guardar", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLabel = () => {
    if (!selectedProduct || !qrImageUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Etiqueta - ${selectedProduct.name}</title></head>
        <body style="font-family: monospace; text-align: center; padding: 20px;">
          <h3 style="margin:0 0 10px 0;">${selectedProduct.sku}</h3>
          <img src="${qrImageUrl}" style="width:150px;height:150px;" />
          <p style="font-size:14px; margin:10px 0 0 0; font-weight:bold;">${selectedProduct.name}</p>
          <p style="font-size:16px; margin:5px 0 0 0;">$${selectedProduct.price.toFixed(2)}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredProducts = products.filter(
    (p: any) =>
      (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  if (loading) {
    return (
      <div className="bg-bg-panel rounded-xl border border-bg-active p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 bg-bg-active rounded animate-pulse-slow" />
              <div className="h-10 bg-bg-active rounded-lg animate-pulse-slow" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scanner Configuration */}
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
          <Bluetooth className="w-5 h-5 text-blue" />
          <h3 className="text-base font-bold text-text-primary">Escáner de Código de Barras / QR</h3>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <Toggle
            title="Escáner habilitado"
            description="Activar soporte para escáner Bluetooth (HID)."
            checked={config.scannerEnabled}
            onChange={(checked) => set("scannerEnabled", checked)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Tipo de escáner">
              <select
                value={config.scannerType}
                onChange={(e) => set("scannerType", e.target.value as ScannerType)}
                className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
              >
                {SCANNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sensibilidad de detección">
              <select
                value={config.scannerSensitivity}
                onChange={(e) => set("scannerSensitivity", e.target.value as BarcodeConfigData["scannerSensitivity"])}
                className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
              >
                {SENSITIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Longitud mínima del código">
              <input
                type="number"
                min={1}
                max={100}
                value={config.minBarcodeLength}
                onChange={(e) => set("minBarcodeLength", Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all font-mono"
              />
            </Field>

            <div className="md:col-span-2 flex gap-3">
              <Toggle
                title="Beep al escanear"
                description="Sonido al detectar código."
                checked={config.beepOnScan}
                onChange={(checked) => set("beepOnScan", checked)}
              />
              <Toggle
                title="LED al escanear"
                description=" Luz LED al detectar código."
                checked={config.ledOnScan}
                onChange={(checked) => set("ledOnScan", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mauve text-bg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar
            </button>
          </div>
        </form>
      </div>

      {/* Test Scanner */}
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
          <QrCode className="w-5 h-5 text-green" />
          <h3 className="text-base font-bold text-text-primary">Probar Escáner</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-dim mb-4">
            Escanea un código de barras o QR para probar la conexión. El código aparecerá abajo.
          </p>
          <div className="relative">
            <input
              type="text"
              readOnly
              placeholder="Escanea aquí..."
              className="w-full h-12 px-4 rounded-lg bg-bg border-2 border-bg-active text-text-primary text-lg font-mono focus:border-mauve/50 focus:ring-2 focus:ring-mauve/20 transition-all"
              onFocus={() => {
                setTestMode(true);
                setLastScan(null);
              }}
              onBlur={() => setTestMode(false)}
            />
            {testMode && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
                <span className="text-xs text-green font-medium">LISTO PARA ESCANEAR</span>
              </div>
            )}
          </div>
          {lastScan && (
            <div className="mt-3 p-3 rounded-lg bg-green/10 border border-green/30 text-sm text-green font-mono">
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Escaneado: <span className="font-bold">{lastScan}</span>
            </div>
          )}
        </div>
      </div>

      {/* QR Label Printer */}
      <div className="bg-bg-panel rounded-xl border border-bg-active overflow-hidden">
        <div className="px-6 py-4 border-b border-bg-active flex items-center gap-3">
          <Printer className="w-5 h-5 text-peach" />
          <h3 className="text-base font-bold text-text-primary">Imprimir Etiqueta QR</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Field label="Buscar producto">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-text-dim" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Nombre, SKU o código de barras..."
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-bg border border-bg-active text-sm text-text-secondary placeholder:text-text-dim focus:border-mauve/50 focus:ring-1 focus:ring-mauve/20 transition-all"
                  />
                </div>
              </Field>

              <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.length === 0 && productSearch && (
                  <p className="text-xs text-text-dim text-center py-4">No se encontraron productos</p>
                )}
                {filteredProducts.slice(0, 20).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch("");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      selectedProduct?.id === p.id
                        ? "bg-mauve/15 border border-mauve/30"
                        : "bg-bg-active/50 hover:bg-bg-active border border-transparent"
                    }`}
                  >
                    <Package className="w-4 h-4 text-text-dim flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
                      <div className="text-xs text-text-dim">
                        {p.sku} — ${p.price.toFixed(2)} — {CATEGORY_LABELS[p.category] || p.category}
                      </div>
                    </div>
                    {p.barcode && (
                      <span className="text-xs text-text-dim font-mono">{p.barcode}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              {selectedProduct ? (
                <>
                  <div className="text-center mb-4">
                    <div className="text-sm font-medium text-text-primary">{selectedProduct.name}</div>
                    <div className="text-xs text-text-dim mt-1">{selectedProduct.sku}</div>
                    <div className="text-lg font-bold text-mauve mt-1">${selectedProduct.price.toFixed(2)}</div>
                  </div>

                  {qrImageUrl && (
                    <img
                      src={qrImageUrl}
                      alt="QR Label"
                      className="w-48 h-48 rounded-lg border border-bg-active"
                    />
                  )}

                  <button
                    onClick={handlePrintLabel}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green/15 text-green text-sm font-semibold hover:bg-green/25 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Etiqueta
                  </button>
                </>
              ) : (
                <div className="text-center text-text-dim py-8">
                  <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecciona un producto para generar su etiqueta QR</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-dim mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-active/50 border border-bg-active">
      <div>
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-xs text-text-dim mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-mauve" : "bg-bg-active"}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function isScannerType(v: any): v is ScannerType {
  return ["1d-barcode", "2d-qr", "2d-data-matrix", "2d-pdf417"].includes(v);
}

function isSensitivity(v: any): v is "low" | "medium" | "high" {
  return ["low", "medium", "high"].includes(v);
}
