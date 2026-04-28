"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCalendarEventAction } from "@/actions/calendar";
import type { FiscalEvent } from "@/db/schema";

function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}

interface Props {
  events: FiscalEvent[];
  /** Si es admin, muestra el botón de borrar (incluido en eventos genéricos). */
  canDelete?: boolean;
}

export function CalendarList({ events, canDelete = false }: Props) {
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
        <li
          key={e.id}
          className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{e.titulo}</p>
            {e.descripcion ? (
              <p className="text-xs text-muted-foreground">{e.descripcion}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {e.esGenerico ? "Genérico" : "Personalizado"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-brand">{fmtFecha(e.fecha)}</div>
            {canDelete ? <DeleteEventButton id={e.id} /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeleteEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar este evento del calendario?")) return;
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const res = await deleteCalendarEventAction(fd);
          if (!res.ok) alert(res.message);
          else router.refresh();
        });
      }}
      aria-label="Eliminar evento"
      className="gap-1"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only md:not-sr-only md:text-xs">
        {pending ? "Borrando..." : "Borrar"}
      </span>
    </Button>
  );
}
