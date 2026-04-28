"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getRequestMeta } from "@/lib/request-context";
import { logAudit } from "@/services/audit";
import { checkFile } from "@/services/file-detect";
import { scanWithVirusTotal } from "@/services/antivirus";
import { encryptAndUpload, deleteBlob } from "@/services/storage";
import {
  autoCategorize,
  createFileRecord,
  softDeleteFile,
  updateFileCategoria,
  updateFileEstado,
} from "@/services/files";
import { createFolder, softDeleteFolder } from "@/services/folders";
import type { ActionResult } from "./auth";

function fail<T = unknown>(code: string, message: string): ActionResult<T> {
  return { ok: false, code, message };
}

async function assertCanAccess(
  ownerId: string,
): Promise<{ userId: string; role: "ADMIN" | "SUPER_ADMIN" | "CLIENT" } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === "CLIENT" && session.user.id !== ownerId) return null;
  return { userId: session.user.id, role: session.user.role };
}

// ---------------------------------------------------------------------
// CREAR carpeta
// ---------------------------------------------------------------------
const folderSchema = z.object({
  ownerId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(1).max(80),
});

export async function createFolderAction(formData: FormData): Promise<ActionResult> {
  const ownerId = String(formData.get("ownerId") ?? "");
  const sess = await assertCanAccess(ownerId);
  if (!sess) return fail("FORBIDDEN", "No autorizado");

  const parsed = folderSchema.safeParse({
    ownerId,
    parentId: formData.get("parentId") || null,
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) return fail("VALIDATION", "Nombre invalido");

  const id = await createFolder({
    clientUserId: parsed.data.ownerId,
    parentId: parsed.data.parentId ?? null,
    nombre: parsed.data.nombre,
    creadaPorUserId: sess.userId,
  });

  const meta = await getRequestMeta();
  await logAudit({
    userId: sess.userId,
    accion: "FOLDER_CREATED",
    recursoTipo: "folder",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

export async function deleteFolderAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const sess = await auth();
  if (!sess?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  const [folder] = await db
    .select()
    .from(schema.folders)
    .where(eq(schema.folders.id, id))
    .limit(1);
  if (!folder) return fail("NOT_FOUND", "No existe");
  // Solo admin o el cliente propietario.
  if (sess.user.role === "CLIENT" && sess.user.id !== folder.clientUserId) {
    return fail("FORBIDDEN", "No autorizado");
  }
  await softDeleteFolder(id);
  const meta = await getRequestMeta();
  await logAudit({
    userId: sess.user.id,
    accion: "FOLDER_DELETED",
    recursoTipo: "folder",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------
// SUBIR archivo: lee File del FormData, valida, cifra, sube, escanea, registra.
// ---------------------------------------------------------------------
export async function uploadFileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ownerId = String(formData.get("ownerId") ?? "");
  const folderId = (formData.get("folderId") as string | null) || null;
  const mensaje = (formData.get("mensaje") as string | null)?.trim() || null;
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("VALIDATION", "Archivo no enviado");

  const sess = await assertCanAccess(ownerId);
  if (!sess) return fail("FORBIDDEN", "No autorizado");

  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 16));

  const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  const check = checkFile(file.name, head, file.size, maxBytes);
  if (!check.ok) return fail("FILE_REJECTED", check.reason ?? "Archivo no permitido");

  // Antivirus PRIMERO (sobre el plaintext) y luego subimos cifrado.
  const av = await scanWithVirusTotal(buffer, file.name);
  if (av.status === "INFECTED") {
    return fail("INFECTED", "El archivo fue detectado como malicioso por el antivirus");
  }

  const pathname = `${ownerId}/${randomUUID()}.bin`;
  const blob = await encryptAndUpload(buffer, pathname);

  const id = await createFileRecord({
    folderId: folderId || null,
    ownerId,
    uploadedById: sess.userId,
    nombreOriginal: file.name,
    nombreAlmacenamiento: blob.pathname,
    blobUrl: blob.url,
    mimeType: file.type || "application/octet-stream",
    tamanoBytes: blob.size,
    sha256: blob.sha256,
    categoria: autoCategorize(file.name),
    mensajeAdjunto: mensaje,
    antivirusStatus: av.status,
    antivirusReport: av.report ?? null,
  });

  const meta = await getRequestMeta();
  await logAudit({
    userId: sess.userId,
    accion: "FILE_UPLOADED",
    recursoTipo: "file",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      ownerId,
      folderId,
      filename: file.name,
      av: av.status,
    },
  });

  // Si admin sube + hay mensaje, lo registramos como mensaje adjunto al cliente.
  if (sess.role !== "CLIENT" && mensaje) {
    await db.insert(schema.messages).values({
      id: randomUUID(),
      fromUserId: sess.userId,
      toClientUserId: ownerId,
      contenido: mensaje,
      archivosAdjuntos: JSON.stringify([id]),
    });
    await logAudit({
      userId: sess.userId,
      accion: "MESSAGE_SENT",
      recursoTipo: "message",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------
// CAMBIAR estado / categoria
// ---------------------------------------------------------------------
const updateMetaSchema = z.object({
  fileId: z.string().uuid(),
  estado: z.enum(schema.ESTADOS_DOC).optional(),
  categoria: z.enum(schema.CATEGORIAS_DOC).optional(),
});

export async function updateFileMetaAction(formData: FormData): Promise<ActionResult> {
  const sess = await auth();
  if (
    !sess?.user?.id ||
    (sess.user.role !== "ADMIN" && sess.user.role !== "SUPER_ADMIN")
  ) {
    return fail("FORBIDDEN", "Solo administradores");
  }
  const parsed = updateMetaSchema.safeParse({
    fileId: formData.get("fileId"),
    estado: formData.get("estado") || undefined,
    categoria: formData.get("categoria") || undefined,
  });
  if (!parsed.success) return fail("VALIDATION", "Datos invalidos");

  if (parsed.data.estado) await updateFileEstado(parsed.data.fileId, parsed.data.estado);
  if (parsed.data.categoria) await updateFileCategoria(parsed.data.fileId, parsed.data.categoria);

  return { ok: true };
}

// ---------------------------------------------------------------------
// BORRAR archivo (soft + delete blob)
// ---------------------------------------------------------------------
export async function deleteFileAction(formData: FormData): Promise<ActionResult> {
  const sess = await auth();
  if (!sess?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  const id = String(formData.get("id") ?? "");
  const [file] = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  if (!file) return fail("NOT_FOUND", "No existe");

  if (sess.user.role === "CLIENT" && sess.user.id !== file.ownerId) {
    return fail("FORBIDDEN", "No autorizado");
  }

  await softDeleteFile(id);
  await deleteBlob(file.blobUrl);

  const meta = await getRequestMeta();
  await logAudit({
    userId: sess.user.id,
    accion: "FILE_DELETED",
    recursoTipo: "file",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}
