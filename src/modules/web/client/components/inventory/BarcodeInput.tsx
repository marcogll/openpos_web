import React from "react";
import { ScanBarcode, Search } from "lucide-react";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";

type BarcodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBarcodeScan: (barcode: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function BarcodeInput({
  value,
  onChange,
  onBarcodeScan,
  onSearch,
  placeholder = "Buscar por nombre, SKU o escanear código de barras...",
  autoFocus,
}: BarcodeInputProps) {
  const [scanFlash, setScanFlash] = React.useState(false);

  const handleScan = React.useCallback(
    (barcode: string) => {
      setScanFlash(true);
      onChange(barcode);
      onBarcodeScan(barcode);
      setTimeout(() => setScanFlash(false), 600);
    },
    [onChange, onBarcodeScan]
  );

  useBarcodeScanner({ onScan: handleScan, minLength: 3 });

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        {scanFlash ? (
          <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSearch) {
              e.preventDefault();
              onSearch();
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full h-10 pl-9 pr-3 rounded-lg bg-bg border text-sm text-text-secondary placeholder:text-text-dim focus:ring-1 transition-all outline-none ${
            scanFlash
              ? "border-green/60 focus:border-green/50 focus:ring-green/20"
              : "border-bg-active focus:border-mauve/50 focus:ring-mauve/20"
          }`}
        />
        {/* Scanner indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${scanFlash ? "bg-green animate-pulse" : "bg-green/40"}`} />
          <span className="text-[9px] text-text-dim hidden sm:inline">SCAN</span>
        </div>
      </div>
      {onSearch && (
        <button
          onClick={onSearch}
          className="px-5 h-10 rounded-lg bg-mauve text-bg text-sm font-semibold hover:opacity-90 transition-all flex-shrink-0"
        >
          Buscar
        </button>
      )}
    </div>
  );
}
