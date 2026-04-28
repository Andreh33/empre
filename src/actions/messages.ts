"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getRequestMeta } from "@/lib/request-context";
import { sendMessage } from "@/services/messages";
import { logAudit } from "@/services/audit";
import { sendEmail, newMessageTemplate } from "@/services/mail";
import type { ActionResult } from "./auth";

const sendSchema = z.object({
  toClientUserId: z.string().uuid(),
  contenido: z.string().trim().min(1).max(4000),
});

export async function sendMessageAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, code: "UNAUTHORIZED", message: "Inicia sesion" };

  const parsed = sendSchema.safeParse({
    toClientUserId: formData.get("toClientUserId"),
    contenido: formData.get("contenido"),
  });
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Mensaje invalido" };

  // Cliente solo puede enviar a su propia conversacion (a si mismo como destinatario).
  if (
    session.user.role === "CLIENT" &&
    parsed.data.toClientUserId !== session.user.id
  ) {
    return { ok: false, code: "FORBIDDEN", message: "No autorizado" };
  }

  await sendMessage({
    fromUserId: session.user.id,
    toClientUserId: parsed.data.toClientUserId,
    contenido: parsed.data.contenido,
  });

  // Notificacion email al receptor.
  const recipientUserId =
    session.user.role === "CLIENT" ? null : parsed.data.toClientUserId;

  if (recipientUserId) {
    const [u] = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, recipientUserId))
      .limit(1);
    if (u) {
      const url = `${env.APP_URL}/panel/mensajes`;
      await sendEmail({ to: u.email, ...newMessageTemplate(url) });
    }
  } else {
    // Cliente -> admin asignado (o todos los admins). Lo notificamos al admin
    // asignado del cliente.
    const [profile] = await db
      .select({ assignedAdminId: schema.clientProfiles.assignedAdminId })
      .from(schema.clientProfiles)
      .where(eq(schema.clientProfiles.userId, parsed.data.toClientUserId))
      .limit(1);
    if (profile?.assignedAdminId) {
      const [admin] = await db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, profile.assignedAdminId))
        .limit(1);
      if (admin) {
        const url = `${env.APP_URL}/admin/clientes/${parsed.data.toClientUserId}/chat`;
        await sendEmail({ to: admin.email, ...newMessageTemplate(url) });
      }
    }
  }

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "MESSAGE_SENT",
    recursoTipo: "client_conversation",
    recursoId: parsed.data.toClientUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}
