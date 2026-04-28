import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { listConversation, markRead, PLANTILLAS_MENSAJES } from "@/services/messages";
import { getProfileByUserId } from "@/services/client-profile";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat con cliente" };

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const [u] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!u || u.role !== "CLIENT") notFound();

  await markRead(id, session.user.id);
  const profile = await getProfileByUserId(id);
  const messages = await listConversation(id);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Chat</p>
        <h1 className="text-2xl font-bold">
          {profile ? `${profile.nombre} ${profile.apellidos}` : id}
        </h1>
        <Link
          href={`/admin/clientes/${id}`}
          className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
        >
          Volver a la ficha
        </Link>
      </div>
      <ChatThread
        toClientUserId={id}
        currentUserId={session.user.id}
        templates={[...PLANTILLAS_MENSAJES]}
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
