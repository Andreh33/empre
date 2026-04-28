import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { listAllEvents } from "@/services/fiscal-calendar";
import { CalendarList } from "@/components/calendar/calendar-list";
import { NewEventForm } from "@/components/calendar/new-event-form";
import { SeedGenericButton } from "./seed-button";

export const metadata: Metadata = { title: "Calendario fiscal (admin)" };

export default async function AdminCalendarPage() {
  const session = await requireAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const events = await listAllEvents(today, inOneYear);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendario fiscal</h1>
          <p className="text-sm text-muted-foreground">
            Eventos genericos (visibles para todos los clientes) y personalizados.
          </p>
        </div>
        {session.user.role === "SUPER_ADMIN" ? <SeedGenericButton /> : null}
      </div>
      <NewEventForm />
      <CalendarList events={events} />
    </div>
  );
}
