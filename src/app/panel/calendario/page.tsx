import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { listEventsForClient } from "@/services/fiscal-calendar";
import { CalendarList } from "@/components/calendar/calendar-list";

export const metadata: Metadata = { title: "Calendario fiscal" };

export default async function ClientCalendarPage() {
  const session = await requireClient();
  const today = new Date().toISOString().slice(0, 10);
  const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const events = await listEventsForClient(session.user.id, today, inOneYear);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calendario fiscal</h1>
        <p className="text-sm text-muted-foreground">
          Vencimientos y eventos relevantes en los proximos 12 meses.
        </p>
      </div>
      <CalendarList events={events} />
    </div>
  );
}
