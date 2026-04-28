"use client";

import { useRef, useState, useTransition } from "react";
import { uploadFileAction } from "@/actions/files";
import { Button } from "@/components/ui/button";

interface Props {
  ownerId: string;
  folderId?: string | null;
  /** Texto explicativo. */
  caption?: string;
  /** Permitir mensaje adjunto (admin lo usa). */
  allowMessage?: boolean;
  onUploaded?: () => void;
}

interface ItemProgress {
  name: string;
  status: "uploading" | "ok" | "error";
  message?: string;
}

export function UploadZone({
  ownerId,
  folderId = null,
  caption = "Arrastra aqui o pulsa para seleccionar (max 50 MB por archivo)",
  allowMessage = false,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [items, setItems] = useState<ItemProgress[]>([]);
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState("");

  function pickFiles() {
    inputRef.current?.click();
  }

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.set("ownerId", ownerId);
    if (folderId) fd.set("folderId", folderId);
    fd.set("file", file);
    if (mensaje) fd.set("mensaje", mensaje);
    const res = await uploadFileAction(fd);
    setItems((prev) =>
      prev.map((p) =>
        p.name === file.name && p.status === "uploading"
          ? res.ok
            ? { ...p, status: "ok" }
            : { ...p, status: "error", message: res.message }
          : p,
      ),
    );
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    setItems((prev) => [
      ...prev,
      ...arr.map((f) => ({ name: f.name, status: "uploading" as const })),
    ]);
    startTransition(async () => {
      for (const f of arr) await uploadOne(f);
      onUploaded?.();
      setMensaje("");
    });
  }

  return (
    <div className="space-y-3">
      {allowMessage ? (
        <textarea
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
          placeholder="Mensaje opcional para el cliente (ej. 'Te dejo tu declaracion de la renta')"
          rows={2}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={pickFiles}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          drag ? "border-gold bg-gold/10" : "border-border bg-muted/40"
        }`}
      >
        <p className="text-sm font-medium">Subir archivos</p>
        <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        <Button type="button" variant="outline" className="mt-3" disabled={isPending}>
          {isPending ? "Subiendo..." : "Seleccionar archivos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.txt,.jpg,.jpeg,.png,.heic,.heif,.webp,.zip"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between rounded border p-2">
              <span className="truncate">{it.name}</span>
              <span
                className={
                  it.status === "ok"
                    ? "text-emerald-600"
                    : it.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }
              >
                {it.status === "ok" ? "Subido" : it.status === "error" ? `Error: ${it.message}` : "Subiendo..."}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
