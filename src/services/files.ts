/**
 * Gestion de archivos cifrados.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { FileRecord } from "@/db/schema";

export const CATEGORIA_AUTO: { match: RegExp; categoria: (typeof schema.CATEGORIAS_DOC)[number] }[] = [
  { match: /\b(renta|irpf|modelo[\s_-]*100)\b/i, categoria: "RENTA" },
  { match: /\b(iva|modelo[\s_-]*303|modelo[\s_-]*390)\b/i, categoria: "IVA" },
  { match: /\b(sociedades|modelo[\s_-]*200)\b/i, categoria: "SOCIEDADES" },
  { match: /\b(nomina|nominas|payroll|salario)\b/i, categoria: "NOMINAS" },
  { match: /\bmodelo[\s_-]*303\b/i, categoria: "MODELO_303" },
  { match: /\bmodelo[\s_-]*130\b/i, categoria: "MODELO_130" },
  { match: /\bmodelo[\s_-]*100\b/i, categoria: "MODELO_100" },
  { match: /\bmodelo[\s_-]*200\b/i, categoria: "MODELO_200" },
];

export function autoCategorize(filename: string): (typeof schema.CATEGORIAS_DOC)[number] {
  for (const r of CATEGORIA_AUTO) if (r.match.test(filename)) return r.categoria;
  return "OTROS";
}

export async function createFileRecord(args: {
  folderId: string | null;
  ownerId: string;
  uploadedById: string;
  nombreOriginal: string;
  nombreAlmacenamiento: string;
  blobUrl: string;
  mimeType: string;
  tamanoBytes: number;
  sha256: string;
  categoria?: (typeof schema.CATEGORIAS_DOC)[number];
  mensajeAdjunto?: string | null;
  antivirusStatus: "PENDING" | "CLEAN" | "INFECTED" | "ERROR";
  antivirusReport?: Record<string, unknown> | null;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.files).values({
    id,
    folderId: args.folderId,
    ownerId: args.ownerId,
    uploadedById: args.uploadedById,
    nombreOriginal: args.nombreOriginal,
    nombreAlmacenamiento: args.nombreAlmacenamiento,
    blobUrl: args.blobUrl,
    mimeType: args.mimeType,
    tamanoBytes: args.tamanoBytes,
    sha256: args.sha256,
    categoria: args.categoria ?? autoCategorize(args.nombreOriginal),
    mensajeAdjunto: args.mensajeAdjunto ?? null,
    antivirusStatus: args.antivirusStatus,
    antivirusReport: args.antivirusReport ? JSON.stringify(args.antivirusReport) : null,
  });
  return id;
}

export async function listFiles(args: {
  ownerId: string;
  folderId?: string | null;
  uploadedByRole?: "admin" | "client";
}): Promise<FileRecord[]> {
  const conds = [eq(schema.files.ownerId, args.ownerId), isNull(schema.files.deletedAt)];
  if (args.folderId !== undefined) {
    if (args.folderId === null) conds.push(isNull(schema.files.folderId));
    else conds.push(eq(schema.files.folderId, args.folderId));
  }
  return db
    .select()
    .from(schema.files)
    .where(and(...conds))
    .orderBy(desc(schema.files.createdAt));
}

/** Archivos enviados por el CLIENTE (uploadedById = ownerId). */
export async function listClientUploads(ownerId: string): Promise<FileRecord[]> {
  return db
    .select()
    .from(schema.files)
    .where(
      and(
        eq(schema.files.ownerId, ownerId),
        eq(schema.files.uploadedById, ownerId),
        isNull(schema.files.deletedAt),
      ),
    )
    .orderBy(desc(schema.files.createdAt));
}

export async function getFileById(id: string): Promise<FileRecord | null> {
  const [row] = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  return row ?? null;
}

export async function getFilesByIds(ids: string[]): Promise<FileRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(schema.files)
    .where(and(inArray(schema.files.id, ids), isNull(schema.files.deletedAt)));
}

export async function softDeleteFile(id: string): Promise<void> {
  await db
    .update(schema.files)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(schema.files.id, id));
}

export async function updateFileEstado(
  id: string,
  estado: (typeof schema.ESTADOS_DOC)[number],
): Promise<void> {
  await db
    .update(schema.files)
    .set({ estado, updatedAt: new Date().toISOString() })
    .where(eq(schema.files.id, id));
}

export async function updateFileCategoria(
  id: string,
  categoria: (typeof schema.CATEGORIAS_DOC)[number],
): Promise<void> {
  await db
    .update(schema.files)
    .set({ categoria, updatedAt: new Date().toISOString() })
    .where(eq(schema.files.id, id));
}
