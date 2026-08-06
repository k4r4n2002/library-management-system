import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Same component decodes both formats html5-qrcode supports out of the box:
// internal circulation QR codes and printed ISBN barcodes (EAN-13) — the
// caller decides what the decoded string means.
export function QrScanner({ onScan, active }: { onScan: (code: string) => void; active: boolean }) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`).current;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setCameraError(null);
    const scanner = new Html5Qrcode(containerId, { verbose: false });
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
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
  }, [active, containerId]);

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
