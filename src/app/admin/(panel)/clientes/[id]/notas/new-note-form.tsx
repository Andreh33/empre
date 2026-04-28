"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createInternalNoteAction } from "@/actions/notes";

export function NewNoteForm({ clientUserId }: { clientUserId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return;
    const fd = new FormData();
    fd.set("clientUserId", clientUserId);
    fd.set("contenido", text.trim());
    start(async () => {
      const res = await createInternalNoteAction(fd);
      if (res.ok) {
        setText("");
        router.refresh();
      } else setError(res.message);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border bg-card p-4">
      <label className="text-sm font-medium">Nueva nota interna</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-background p-2 text-sm"
        placeholder="Escribe una nota privada (no visible al cliente)..."
      />
      <div className="flex items-center justify-between">
        {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? "Guardando..." : "Añadir nota"}
        </Button>
      </div>
    </form>
  );
}
