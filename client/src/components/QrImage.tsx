import { useEffect, useState } from "react";
import { qrImageUrl, adminTokenStore } from "../lib/api";

// Fetched as an authenticated blob rather than a plain <img src>, since the
// QR endpoint sits behind requireAuth and a bare <img> tag has no way to
// attach an Authorization header.
export function QrImage({ copyId, size = 160 }: { copyId: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const token = adminTokenStore.get();

    fetch(qrImageUrl(copyId), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [copyId]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-xl bg-primary-soft"
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Book copy QR code"
      className="rounded-xl border border-border-soft"
    />
  );
}
