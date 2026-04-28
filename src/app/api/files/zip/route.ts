/**
 * Descarga ZIP de varios archivos (descifra al vuelo).
 * POST /api/files/zip  body: { ids: string[] }
 */
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFilesByIds } from "@/services/files";
import { downloadAndDecrypt } from "@/services/storage";
import { logAudit } from "@/services/audit";
import { getRequestMeta } from "@/lib/request-context";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = (body?.ids ?? []).filter((s) => typeof s === "string");
  if (ids.length === 0 || ids.length > 200) {
    return new NextResponse("ids invalidos", { status: 400 });
  }
  const files = await getFilesByIds(ids);

  // Permisos: cliente solo accede a sus archivos.
  if (session.user.role === "CLIENT") {
    for (const f of files) {
      if (f.ownerId !== session.user.id) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
  }

  const zip = new JSZip();
  for (const f of files) {
    if (f.antivirusStatus === "INFECTED") continue;
    try {
      const data = await downloadAndDecrypt(f.blobUrl);
      // Evita colisiones de nombre.
      let name = f.nombreOriginal;
      let i = 1;
      while (zip.file(name)) {
        const dot = f.nombreOriginal.lastIndexOf(".");
        const base = dot >= 0 ? f.nombreOriginal.slice(0, dot) : f.nombreOriginal;
        const ext = dot >= 0 ? f.nombreOriginal.slice(dot) : "";
        name = `${base}_${i}${ext}`;
        i++;
      }
      zip.file(name, data);
    } catch (err) {
      console.error("[zip] fallo descarga:", err);
    }
  }

  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "FILE_DOWNLOADED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { kind: "zip", count: files.length },
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="documentos.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
