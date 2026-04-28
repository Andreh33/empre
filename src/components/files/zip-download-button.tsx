"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ZipDownloadButton({ ids, label = "Descargar todo (ZIP)" }: { ids: string[]; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/files/zip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert("No se pudo generar el ZIP");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documentos.zip";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={go} disabled={busy || ids.length === 0}>
      {busy ? "Generando..." : label}
    </Button>
  );
}
