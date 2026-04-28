"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createEvent, deleteEvent, seedGenericEvents } from "@/services/fiscal-calendar";
import { logAudit } from "@/services/audit";
import { getRequestMeta } from "@/lib/request-context";
import type { ActionResult } from "./auth";

const eventSchema = z.object({
  titulo: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(500).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida"),
  clientUserId: z.string().uuid().optional().nullable(),
  recordatorioDiasAntes: z.coerce.number().int().min(0).max(60).default(7),
});

export async function createCalendarEventAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Solo administradores" };
  }

  const obj: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : undefined;
  if (obj.clientUserId === "") obj.clientUserId = undefined;

  const parsed = eventSchema.safeParse(obj);
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Revisa los campos" };

  const id = await createEvent({
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion,
    fecha: parsed.data.fecha,
    esGenerico: !parsed.data.clientUserId,
    clientUserId: parsed.data.clientUserId ?? null,
    recordatorioDiasAntes: parsed.data.recordatorioDiasAntes,
    creadoPorUserId: session.user.id,
  });

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "USER_UPDATED",
    recursoTipo: "fiscal_event",
    recursoId: id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

export async function deleteCalendarEventAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Solo administradores" };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, code: "VALIDATION", message: "Falta id" };
  await deleteEvent(id);
  revalidatePath("/admin/calendario");
  revalidatePath("/panel/calendario");
  return { ok: true };
}

export async function seedGenericEventsAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Solo administradores" };
  }
  const year = new Date().getFullYear();
  await seedGenericEvents(year, session.user.id);
  await seedGenericEvents(year + 1, session.user.id);
  revalidatePath("/admin/calendario");
  return { ok: true };
}
