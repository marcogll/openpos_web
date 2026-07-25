import React from "react";

type BarcodeScannerOptions = {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxGapMs?: number;
};

/**
 * Hook to detect Bluetooth barcode scanner input.
 * Barcode scanners act as HID keyboards and type very fast (~30-100 chars/sec).
 * This hook detects rapid sequential keystrokes and differentiates them from manual typing.
 */
export function useBarcodeScanner({ onScan, minLength = 3, maxGapMs = 80 }: BarcodeScannerOptions) {
  const bufferRef = React.useRef("");
  const lastTimeRef = React.useRef(0);
  const scanningRef = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      const now = Date.now();
      const gap = now - lastTimeRef.current;

      // Ignore modifier keys, function keys, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && e.key !== "Enter" && e.key !== "Tab") return;

      // If gap is large, user is probably typing manually — reset
      if (gap > maxGapMs && bufferRef.current.length > 0 && e.key !== "Enter") {
        bufferRef.current = "";
        scanningRef.current = false;
      }

      lastTimeRef.current = now;

      if (e.key === "Enter" || e.key === "Tab") {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minLength) {
          e.preventDefault();
          scanningRef.current = true;
          onScan(barcode);
        }
        bufferRef.current = "";
        scanningRef.current = false;
        return;
      }

      // Only accept printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Mark as scanning if characters arrive fast enough
        if (gap <= maxGapMs) {
          scanningRef.current = true;
        }
      }

      // Auto-clear buffer after inactivity
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minLength && scanningRef.current) {
          onScan(barcode);
        }
        bufferRef.current = "";
        scanningRef.current = false;
      }, 300);
    },
    [onScan, minLength, maxGapMs]
  );

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleKeyDown]);

  return { isScanning: scanningRef.current };
}
