import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QrScannerProps {
  onScan: (code: string) => void;
  active: boolean;
  // Circulation QR codes are square; printed ISBN barcodes (EAN-13/UPC) are
  // wide rectangles — the scan crop region needs to match, or a barcode's
  // width gets cut off before it ever reaches the decoder.
  boxAspect?: "square" | "wide";
}

export function QrScanner({ onScan, active, boxAspect = "square" }: QrScannerProps) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`).current;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setCameraError(null);
    const scanner = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
    });
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: boxAspect === "wide" ? { width: 280, height: 140 } : { width: 240, height: 240 },
        },
        (decodedText) => {
          if (stopped) return;
          onScanRef.current(decodedText);
        },
        () => {
          // Per-frame "nothing decoded yet" — expected on almost every frame, not an error.
        }
      )
      .catch(() => {
        setCameraError("Couldn't access the camera. Check permissions, or use manual entry below.");
      });

    return () => {
      stopped = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [active, containerId, boxAspect]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div
        id={containerId}
        className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-border-soft bg-plum/5"
      />
      {cameraError && <p className="text-center text-sm font-medium text-danger">{cameraError}</p>}
    </div>
  );
}
