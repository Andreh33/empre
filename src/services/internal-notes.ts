/**
 * Notas internas del admin sobre clientes. NUNCA visibles al cliente.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listNotes(clientUserId: string) {
  return db
    .select({
      id: schema.internalNotes.id,
      contenido: schema.internalNotes.contenido,
      createdAt: schema.internalNotes.createdAt,
      authorUserId: schema.internalNotes.authorUserId,
      authorEmail: schema.users.email,
    })
    .from(schema.internalNotes)
    .innerJoin(schema.users, eq(schema.users.id, schema.internalNotes.authorUserId))
    .where(
      and(
        eq(schema.internalNotes.clientUserId, clientUserId),
        isNull(schema.internalNotes.deletedAt),
      ),
    )
    .orderBy(desc(schema.internalNotes.createdAt));
}

export async function createNote(args: {
  clientUserId: string;
  authorUserId: string;
  contenido: string;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.internalNotes).values({
    id,
    clientUserId: args.clientUserId,
    authorUserId: args.authorUserId,
    contenido: args.contenido,
  });
  return id;
}

export async function deleteNote(id: string) {
  await db
    .update(schema.internalNotes)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(schema.internalNotes.id, id));
}
