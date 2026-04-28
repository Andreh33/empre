"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedGenericEventsAction } from "@/actions/calendar";
import { Button } from "@/components/ui/button";

export function SeedGenericButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="gold"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cargar eventos fiscales genericos para este anyo y el siguiente?")) return;
        start(async () => {
          const res = await seedGenericEventsAction();
          if (!res.ok) alert(res.message);
          else router.refresh();
        });
      }}
    >
      {pending ? "Cargando..." : "Cargar eventos genericos"}
    </Button>
  );
}
