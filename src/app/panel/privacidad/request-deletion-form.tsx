"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestDeletionAction } from "@/actions/rgpd";

export function RequestDeletionForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!confirm("Seguro que quieres solicitar la baja de tu cuenta?")) return;
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestDeletionAction(fd);
      if (!res.ok) setError(res.message);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="password">Confirma con tu contraseña</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Procesando..." : "Solicitar baja"}
      </Button>
    </form>
  );
}
