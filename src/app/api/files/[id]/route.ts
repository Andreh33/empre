/**
 * Descarga / previsualizacion de archivos cifrados.
 * Solo el cliente propietario o un ADMIN pueden acceder.
 *
 * ?disposition=inline -> previsualizacion en navegador (PDF/img).
 * ?disposition=attachment (default) -> descarga forzada.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFileById } from "@/services/files";
import { downloadAndDecrypt } from "@/services/storage";
import { logAudit } from "@/services/audit";
import { getRequestMeta } from "@/lib/request-context";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { id } = await ctx.params;
  const file = await getFileById(id);
  if (!file || file.deletedAt) return new NextResponse("Not found", { status: 404 });

  if (
    session.user.role === "CLIENT" &&
    session.user.id !== file.ownerId
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (file.antivirusStatus === "INFECTED") {
    return new NextResponse("Archivo bloqueado por antivirus", { status: 451 });
  }

  const url = new URL(req.url);
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  const data = await downloadAndDecrypt(file.blobUrl);

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "FILE_DOWNLOADED",
    recursoTipo: "file",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { disposition },
  });

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.nombreOriginal)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
