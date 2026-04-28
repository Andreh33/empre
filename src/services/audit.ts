/**
 * Registro de eventos de auditoria. Inmutable: nunca se actualiza/borra.
 * Retencion 12 meses (limpieza por cron en Fase 9).
 */
import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import type { AuditLog } from "@/db/schema";

type AuditAction = (typeof schema.ACCIONES_AUDIT)[number];

interface AuditArgs {
  userId: string | null;
  accion: AuditAction;
  recursoTipo?: string;
  recursoId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(args: AuditArgs): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      id: randomUUID(),
      userId: args.userId,
      accion: args.accion,
      recursoTipo: args.recursoTipo,
      recursoId: args.recursoId,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
      metadata: args.metadata ? JSON.stringify(args.metadata) : null,
    });
  } catch (err) {
    // Auditoria nunca debe romper el flujo de negocio.
    console.error("[audit] error registrando evento:", err);
  }
}

export type { AuditLog };
