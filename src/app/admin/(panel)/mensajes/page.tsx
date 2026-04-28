import Link from "next/link";
import type { Metadata } from "next";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { listConversations, unreadCountForAdmin } from "@/services/messages";

export const metadata: Metadata = { title: "Mensajes" };

export default async function AdminMensajesPage() {
  await requireAdmin();
  const conversations = await listConversations(50);
  const unread = await unreadCountForAdmin();

  const ids = conversations.map((c) => c.clientUserId);
  const profiles =
    ids.length > 0
      ? await db
          .select({
            userId: schema.clientProfiles.userId,
            nombre: schema.clientProfiles.nombre,
            apellidos: schema.clientProfiles.apellidos,
            email: schema.users.email,
          })
          .from(schema.clientProfiles)
          .leftJoin(schema.users, eq(schema.users.id, schema.clientProfiles.userId))
          .where(inArray(schema.clientProfiles.userId, ids))
      : [];
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mensajes</h1>
          <p className="text-sm text-muted-foreground">
            Conversaciones recientes con clientes. Selecciona una para responder.
          </p>
        </div>
        {unread > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            {unread} sin leer
          </span>
        ) : null}
      </header>

      <div className="overflow-hidden rounded-lg border bg-card">
        {conversations.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Aun no hay conversaciones. Cuando un cliente escriba, aparecera aqui.
          </p>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => {
              const p = byId.get(c.clientUserId);
              const nombre =
                p?.nombre && p.apellidos ? `${p.apellidos}, ${p.nombre}` : p?.email ?? c.clientUserId;
              return (
                <li key={c.clientUserId}>
                  <Link
                    href={`/admin/clientes/${c.clientUserId}/chat`}
                    className="flex items-start justify-between gap-4 p-4 transition hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{nombre}</p>
                      <p className="truncate text-sm text-muted-foreground">{c.contenido}</p>
                    </div>
                    <time
                      dateTime={c.ultimoAt}
                      className="whitespace-nowrap text-xs text-muted-foreground"
                    >
                      {new Date(c.ultimoAt).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
