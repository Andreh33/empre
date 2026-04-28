"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFileAction, updateFileMetaAction } from "@/actions/files";
import { ESTADOS_DOC, CATEGORIAS_DOC } from "@/db/schema";

export function EstadoSelect({ fileId, value }: { fileId: string; value: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("fileId", fileId);
    fd.set("estado", e.target.value);
    start(async () => {
      await updateFileMetaAction(fd);
      router.refresh();
    });
  }

  return (
    <select
      defaultValue={value}
      onChange={onChange}
      disabled={pending}
      className="h-8 rounded border bg-background px-2 text-xs"
    >
      {ESTADOS_DOC.map((e) => (
        <option key={e} value={e}>
          {e.replace("_", " ").toLowerCase()}
        </option>
      ))}
    </select>
  );
}

export function CategoriaSelect({ fileId, value }: { fileId: string; value: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("fileId", fileId);
    fd.set("categoria", e.target.value);
    start(async () => {
      await updateFileMetaAction(fd);
      router.refresh();
    });
  }

  return (
    <select
      defaultValue={value}
      onChange={onChange}
      disabled={pending}
      className="h-8 rounded border bg-background px-2 text-xs"
    >
      {CATEGORIAS_DOC.map((c) => (
        <option key={c} value={c}>
          {c.replace("_", " ").toLowerCase()}
        </option>
      ))}
    </select>
  );
}

export function DeleteFileButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm("Borrar este archivo?")) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await deleteFileAction(fd);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-destructive underline"
    >
      {pending ? "..." : "Borrar"}
    </button>
  );
}
