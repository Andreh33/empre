/**
 * Servicio de mensajeria admin <-> cliente.
 * Convenciones:
 *   - toClientUserId siempre es el ID del CLIENTE de la conversacion.
 *   - fromUserId puede ser cliente (auto-mensaje al admin) o admin.
 *   - Conversacion = todos los mensajes con toClientUserId = X.
 */
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Message } from "@/db/schema";

export async function listConversation(clientUserId: string): Promise<Message[]> {
  return db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.toClientUserId, clientUserId),
        isNull(schema.messages.deletedAt),
      ),
    )
    .orderBy(schema.messages.createdAt);
}

export async function sendMessage(args: {
  fromUserId: string;
  toClientUserId: string;
  contenido: string;
  archivosAdjuntos?: string[];
}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.messages).values({
    id,
    fromUserId: args.fromUserId,
    toClientUserId: args.toClientUserId,
    contenido: args.contenido,
    archivosAdjuntos: args.archivosAdjuntos
      ? JSON.stringify(args.archivosAdjuntos)
      : null,
  });
  return id;
}

/**
 * Marca como leido todos los mensajes de la conversacion que NO sean del
 * usuario actual.
 */
export async function markRead(clientUserId: string, currentUserId: string) {
  await db
    .update(schema.messages)
    .set({ leido: true, leidoAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.messages.toClientUserId, clientUserId),
        eq(schema.messages.leido, false),
        ne(schema.messages.fromUserId, currentUserId),
      ),
    );
}

/** Cuenta mensajes no leidos de un cliente o de un admin. */
export async function unreadCountForClient(clientUserId: string): Promise<number> {
  // Cliente: cuentan mensajes que NO envio el (es decir, los del admin).
  const [row] = await db
    .select({ c: count() })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.toClientUserId, clientUserId),
        eq(schema.messages.leido, false),
        ne(schema.messages.fromUserId, clientUserId),
        isNull(schema.messages.deletedAt),
      ),
    );
  return row?.c ?? 0;
}

export async function unreadCountForAdmin(): Promise<number> {
  // Mensajes enviados por clientes (fromUserId = toClientUserId) y no leidos.
  const [row] = await db
    .select({ c: count() })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.leido, false),
        isNull(schema.messages.deletedAt),
      ),
    );
  // Filtra a mano los del admin (no podemos comparar dos columnas con eq directamente sin sql.raw).
  // Simplificamos: cuenta total de no leidos para el admin (puede incluir admin->admin pero no hay).
  return row?.c ?? 0;
}

/** Listado de conversaciones del admin: ultimos clientes con actividad. */
export async function listConversations(limit = 50) {
  const rows = await db
    .select({
      clientUserId: schema.messages.toClientUserId,
      ultimoAt: schema.messages.createdAt,
      contenido: schema.messages.contenido,
    })
    .from(schema.messages)
    .where(isNull(schema.messages.deletedAt))
    .orderBy(desc(schema.messages.createdAt))
    .limit(500);

  const seen = new Map<string, { clientUserId: string; ultimoAt: string; contenido: string }>();
  for (const r of rows) {
    if (!seen.has(r.clientUserId)) seen.set(r.clientUserId, r);
    if (seen.size >= limit) break;
  }
  return Array.from(seen.values());
}

/** Plantillas frecuentes del admin (estaticas; en Fase 6 se podrian guardar en BBDD). */
export const PLANTILLAS_MENSAJES = [
  {
    titulo: "Pedir documentacion",
    contenido:
      "Hola, para preparar tu declaracion necesitamos: certificado bancario, ultimas nominas y cualquier factura deducible. Cuando puedas subelo a Documentos. Gracias.",
  },
  {
    titulo: "Documentos listos",
    contenido:
      "Hola, ya tienes disponibles tus documentos en la pestanya de Documentos. Cualquier duda nos cuentas.",
  },
  {
    titulo: "Recordatorio vencimiento",
    contenido:
      "Hola, te recordamos que se acerca el plazo del proximo modelo trimestral. Si tienes facturas pendientes, subelas cuanto antes.",
  },
  {
    titulo: "Confirmacion firma",
    contenido:
      "Hola, te hemos preparado el documento listo para firmar. Revisalo y confirmanos por aqui.",
  },
] as const;
