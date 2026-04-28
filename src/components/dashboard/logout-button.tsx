"use client";

import { useTransition } from "react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <form action={() => start(() => logoutAction())}>
      <Button variant="outline" type="submit" disabled={pending} size="sm">
        {pending ? "Saliendo..." : "Cerrar sesion"}
      </Button>
    </form>
  );
}
