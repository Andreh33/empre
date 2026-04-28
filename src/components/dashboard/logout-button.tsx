"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <form action={() => start(() => logoutAction())}>
      <Button
        variant="gold"
        type="submit"
        disabled={pending}
        size="sm"
        className="gap-2"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {pending ? "Saliendo..." : "Cerrar sesion"}
      </Button>
    </form>
  );
}
