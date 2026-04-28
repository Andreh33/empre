import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { listConversation, markRead } from "@/services/messages";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Mensajes" };

export default async function MensajesPage() {
  const session = await requireClient();
  await markRead(session.user.id, session.user.id);
  const messages = await listConversation(session.user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mensajes con tu asesor</h1>
        <p className="text-sm text-muted-foreground">
          Envia preguntas y recibe respuestas de la asesoria.
        </p>
      </div>
      <ChatThread
        toClientUserId={session.user.id}
        currentUserId={session.user.id}
        messages={messages.map((m) => ({
          id: m.id,
          contenido: m.contenido,
          fromUserId: m.fromUserId,
          createdAt: m.createdAt,
          archivosAdjuntos: m.archivosAdjuntos,
        }))}
      />
    </div>
  );
}
