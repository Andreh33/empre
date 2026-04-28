import type { FiscalEvent } from "@/db/schema";

function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}

export function CalendarList({ events }: { events: FiscalEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        No hay eventos en este rango.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">{e.titulo}</p>
            {e.descripcion ? (
              <p className="text-xs text-muted-foreground">{e.descripcion}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {e.esGenerico ? "Generico" : "Personalizado"}
            </p>
          </div>
          <div className="text-sm font-semibold text-brand">{fmtFecha(e.fecha)}</div>
        </li>
      ))}
    </ul>
  );
}
