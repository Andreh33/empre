/**
 * Gestion de carpetas jerarquicas por cliente.
 */
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

export interface FolderNode {
  id: string;
  parentId: string | null;
  nombre: string;
  children: FolderNode[];
}

export async function listFolders(clientUserId: string) {
  const rows = await db
    .select()
    .from(schema.folders)
    .where(
      and(
        eq(schema.folders.clientUserId, clientUserId),
        isNull(schema.folders.deletedAt),
      ),
    )
    .orderBy(schema.folders.nombre);
  return rows;
}

export async function getFolderTree(clientUserId: string): Promise<FolderNode[]> {
  const rows = await listFolders(clientUserId);
  const map = new Map<string, FolderNode>();
  for (const r of rows) {
    map.set(r.id, { id: r.id, parentId: r.parentId, nombre: r.nombre, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function createFolder(args: {
  clientUserId: string;
  parentId: string | null;
  nombre: string;
  creadaPorUserId: string;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.folders).values({
    id,
    clientUserId: args.clientUserId,
    parentId: args.parentId ?? null,
    nombre: args.nombre,
    creadaPorUserId: args.creadaPorUserId,
  });
  return id;
}

export async function softDeleteFolder(id: string): Promise<void> {
  await db
    .update(schema.folders)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(schema.folders.id, id));
}
