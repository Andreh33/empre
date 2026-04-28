/**
 * Exportacion RGPD Art.15: ZIP con JSON de todos los datos del usuario
 * + carpeta "documentos/" con sus archivos descifrados.
 */
import JSZip from "jszip";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getProfileByUserId } from "@/services/client-profile";
import { listFiles } from "@/services/files";
import { downloadAndDecrypt } from "@/services/storage";

export async function buildUserExport(userId: string): Promise<Uint8Array> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const profile = await getProfileByUserId(userId);
  const files = await listFiles({ ownerId: userId });
  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.toClientUserId, userId));
  const consents = await db
    .select()
    .from(schema.consents)
    .where(eq(schema.consents.userId, userId));
  const audit = await db
    .select()
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.userId, userId));

  // Sanitiza: quita hashes de password.
  const safeUser = user
    ? {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      }
    : null;

  const data = {
    exportedAt: new Date().toISOString(),
    user: safeUser,
    profile,
    files: files.map((f) => ({
      id: f.id,
      nombreOriginal: f.nombreOriginal,
      categoria: f.categoria,
      estado: f.estado,
      tamanoBytes: f.tamanoBytes,
      sha256: f.sha256,
      createdAt: f.createdAt,
    })),
    messages,
    consents,
    auditLogs: audit,
  };

  const zip = new JSZip();
  zip.file("datos.json", JSON.stringify(data, null, 2));

  const docs = zip.folder("documentos");
  for (const f of files) {
    if (!docs) break;
    if (f.antivirusStatus === "INFECTED") continue;
    try {
      const bytes = await downloadAndDecrypt(f.blobUrl);
      docs.file(f.nombreOriginal, bytes);
    } catch (err) {
      console.error("[rgpd] fallo descarga:", err);
    }
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
