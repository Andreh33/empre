/**
 * Calendario fiscal: eventos genericos (precargados) + personalizados.
 * Los plazos se actualizan cada anyo en la AEAT; aqui dejamos los modelos
 * trimestrales/anuales mas comunes con fechas tipicas. Revisar cada anyo.
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, lte, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

export interface CalendarEventInput {
  titulo: string;
  descripcion?: string;
  fecha: string; // ISO YYYY-MM-DD
  esGenerico: boolean;
  clientUserId?: string | null;
  recordatorioDiasAntes?: number;
  creadoPorUserId?: string;
}

export async function createEvent(input: CalendarEventInput): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.fiscalEvents).values({
    id,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    fecha: input.fecha,
    esGenerico: input.esGenerico,
    clientUserId: input.clientUserId ?? null,
    recordatorioDiasAntes: input.recordatorioDiasAntes ?? 7,
    creadoPorUserId: input.creadoPorUserId ?? null,
  });
  return id;
}

export async function listEventsForClient(clientUserId: string, fromIso: string, toIso: string) {
  return db
    .select()
    .from(schema.fiscalEvents)
    .where(
      and(
        isNull(schema.fiscalEvents.deletedAt),
        gte(schema.fiscalEvents.fecha, fromIso),
        lte(schema.fiscalEvents.fecha, toIso),
        or(
          eq(schema.fiscalEvents.esGenerico, true),
          eq(schema.fiscalEvents.clientUserId, clientUserId),
        ),
      ),
    )
    .orderBy(asc(schema.fiscalEvents.fecha));
}

export async function listAllEvents(fromIso: string, toIso: string) {
  return db
    .select()
    .from(schema.fiscalEvents)
    .where(
      and(
        isNull(schema.fiscalEvents.deletedAt),
        gte(schema.fiscalEvents.fecha, fromIso),
        lte(schema.fiscalEvents.fecha, toIso),
      ),
    )
    .orderBy(asc(schema.fiscalEvents.fecha));
}

export async function deleteEvent(id: string) {
  await db
    .update(schema.fiscalEvents)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(schema.fiscalEvents.id, id));
}

/** Genera eventos genericos para el anyo dado. Idempotente por titulo+fecha. */
export async function seedGenericEvents(year: number, creatorUserId: string) {
  const items: { titulo: string; descripcion: string; fecha: string }[] = [
    // Modelos trimestrales (plazos AEAT habituales).
    { titulo: "Modelo 303 - 1T IVA", descripcion: "IVA 1er trimestre", fecha: `${year}-04-20` },
    { titulo: "Modelo 303 - 2T IVA", descripcion: "IVA 2do trimestre", fecha: `${year}-07-20` },
    { titulo: "Modelo 303 - 3T IVA", descripcion: "IVA 3er trimestre", fecha: `${year}-10-20` },
    { titulo: "Modelo 303 - 4T IVA", descripcion: "IVA 4to trimestre", fecha: `${year + 1}-01-30` },
    { titulo: "Modelo 130 - 1T IRPF autonomos", descripcion: "Pago fraccionado IRPF", fecha: `${year}-04-20` },
    { titulo: "Modelo 130 - 2T", descripcion: "Pago fraccionado IRPF", fecha: `${year}-07-20` },
    { titulo: "Modelo 130 - 3T", descripcion: "Pago fraccionado IRPF", fecha: `${year}-10-20` },
    { titulo: "Modelo 130 - 4T", descripcion: "Pago fraccionado IRPF", fecha: `${year + 1}-01-30` },
    { titulo: "Modelo 115 - 1T retenciones alquileres", descripcion: "Retenciones e ingresos a cuenta", fecha: `${year}-04-20` },
    { titulo: "Modelo 115 - 2T", descripcion: "Retenciones alquileres", fecha: `${year}-07-20` },
    { titulo: "Modelo 115 - 3T", descripcion: "Retenciones alquileres", fecha: `${year}-10-20` },
    { titulo: "Modelo 115 - 4T", descripcion: "Retenciones alquileres", fecha: `${year + 1}-01-30` },
    { titulo: "Modelo 111 - 1T retenciones trabajo", descripcion: "Retenciones trabajadores", fecha: `${year}-04-20` },
    { titulo: "Modelo 111 - 2T", descripcion: "Retenciones trabajadores", fecha: `${year}-07-20` },
    { titulo: "Modelo 111 - 3T", descripcion: "Retenciones trabajadores", fecha: `${year}-10-20` },
    { titulo: "Modelo 111 - 4T", descripcion: "Retenciones trabajadores", fecha: `${year + 1}-01-30` },
    // Anuales.
    { titulo: "Modelo 390 - resumen anual IVA", descripcion: "Resumen anual IVA", fecha: `${year + 1}-01-30` },
    { titulo: "Modelo 180 - resumen anual alquileres", descripcion: "Resumen anual 115", fecha: `${year + 1}-01-31` },
    { titulo: "Modelo 190 - resumen anual retenciones", descripcion: "Resumen anual 111", fecha: `${year + 1}-01-31` },
    { titulo: "Modelo 347 - operaciones con terceros", descripcion: ">3.005,06 EUR", fecha: `${year + 1}-02-28` },
    { titulo: "Modelo 349 - operaciones intracomunitarias", descripcion: "Mensual/Trimestral", fecha: `${year + 1}-01-30` },
    { titulo: "Modelo 100 - declaracion de la renta", descripcion: "IRPF anual", fecha: `${year + 1}-06-30` },
    { titulo: "Modelo 200 - impuesto sociedades", descripcion: "Sociedades anual", fecha: `${year + 1}-07-25` },
  ];

  for (const ev of items) {
    // Idempotencia: comprueba si ya existe.
    const existing = await db
      .select({ id: schema.fiscalEvents.id })
      .from(schema.fiscalEvents)
      .where(
        and(
          eq(schema.fiscalEvents.titulo, ev.titulo),
          eq(schema.fiscalEvents.fecha, ev.fecha),
          eq(schema.fiscalEvents.esGenerico, true),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;
    await createEvent({ ...ev, esGenerico: true, creadoPorUserId: creatorUserId });
  }
}
