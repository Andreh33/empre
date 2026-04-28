"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCalendarEventAction } from "@/actions/calendar";

export function NewEventForm({ clientUserId }: { clientUserId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (clientUserId) fd.set("clientUserId", clientUserId);
    start(async () => {
      const res = await createCalendarEventAction(fd);
      if (res.ok) {
        setDone(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
        setTimeout(() => setDone(false), 2000);
      } else setError(res.message);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <Label htmlFor="titulo">Titulo</Label>
        <Input id="titulo" name="titulo" required />
      </div>
      <div>
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" name="fecha" type="date" required />
      </div>
      <div>
        <Label htmlFor="recordatorioDiasAntes">Avisar (dias antes)</Label>
        <Input
          id="recordatorioDiasAntes"
          name="recordatorioDiasAntes"
          type="number"
          min={0}
          max={60}
          defaultValue={7}
        />
      </div>
      <div className="md:col-span-4">
        <Label htmlFor="descripcion">Descripcion (opcional)</Label>
        <Input id="descripcion" name="descripcion" />
      </div>
      <div className="md:col-span-4 flex items-center justify-end gap-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {done ? <p className="text-sm text-emerald-600">Anyadido.</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Anyadir evento"}
        </Button>
      </div>
    </form>
  );
}
