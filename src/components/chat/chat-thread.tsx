"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction } from "@/actions/messages";
import { Button } from "@/components/ui/button";

interface MessageView {
  id: string;
  contenido: string;
  fromUserId: string;
  createdAt: string;
  archivosAdjuntos: string | null;
}

export function ChatThread({
  toClientUserId,
  currentUserId,
  messages,
  templates,
}: {
  toClientUserId: string;
  currentUserId: string;
  messages: MessageView[];
  templates?: { titulo: string; contenido: string }[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return;
    const fd = new FormData();
    fd.set("toClientUserId", toClientUserId);
    fd.set("contenido", text.trim());
    startTransition(async () => {
      const res = await sendMessageAction(fd);
      if (res.ok) {
        setText("");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border bg-card">
      <ul className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.length === 0 ? (
          <li className="text-center text-muted-foreground">Aun no hay mensajes.</li>
        ) : null}
        {messages.map((m) => {
          const mine = m.fromUserId === currentUserId;
          return (
            <li
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.createdAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {templates && templates.length > 0 ? (
        <div className="border-t p-2">
          <p className="mb-1 text-xs uppercase text-muted-foreground">Plantillas</p>
          <div className="flex flex-wrap gap-1">
            {templates.map((t) => (
              <button
                key={t.titulo}
                type="button"
                onClick={() => setText(t.contenido)}
                className="rounded-full border px-2 py-1 text-xs hover:bg-accent"
              >
                {t.titulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <textarea
          className="min-h-[44px] flex-1 rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={4000}
        />
        <Button type="submit" disabled={isPending || !text.trim()}>
          {isPending ? "Enviando..." : "Enviar"}
        </Button>
      </form>
      {error ? <p className="px-3 pb-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
