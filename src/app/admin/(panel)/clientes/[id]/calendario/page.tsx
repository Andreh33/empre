import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { listEventsForClient } from "@/services/fiscal-calendar";
import { CalendarList } from "@/components/calendar/calendar-list";
import { NewEventForm } from "@/components/calendar/new-event-form";

export const metadata: Metadata = { title: "Calendario del cliente" };

export default async function ClienteCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [u] = await db
    .select({ role: schema.users.role, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!u || u.role !== "CLIENT") notFound();

  const today = new Date().toISOString().slice(0, 10);
  const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const events = await listEventsForClient(id, today, inOneYear);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Calendario del cliente</p>
        <h1 className="text-2xl font-bold">{u.email}</h1>
        <Link
          href={`/admin/clientes/${id}`}
          className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
        >
          Volver
        </Link>
      </div>
      <NewEventForm clientUserId={id} />
      <CalendarList events={events} />
    </div>
  );
}
