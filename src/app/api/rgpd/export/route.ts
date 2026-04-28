import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildUserExport } from "@/services/rgpd-export";
import { logAudit } from "@/services/audit";
import { getRequestMeta } from "@/lib/request-context";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const targetId = url.searchParams.get("userId") ?? session.user.id;

  // Cliente solo puede pedir el suyo. Admin puede cualquiera.
  if (session.user.role === "CLIENT" && targetId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buf = await buildUserExport(targetId);
  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "DATA_EXPORTED",
    recursoTipo: "user",
    recursoId: targetId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="datos-rgpd-${targetId}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
