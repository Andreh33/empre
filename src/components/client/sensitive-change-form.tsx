"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestSensitiveChangeAction } from "@/actions/profile";

export function SensitiveChangeForm({ tipo }: { tipo: "DNI" | "IBAN" }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    startTransition(async () => {
      const res = await requestSensitiveChangeAction(fd);
      if (res.ok) setDone(true);
      else setError(res.message);
    });
  }

  if (done) {
    return (
      <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
        Te hemos enviado un email para confirmar el cambio de {tipo}. El cambio NO se aplicara
        hasta que pulses el enlace (caduca en 30 min).
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`new-${tipo}`}>Nuevo {tipo}</Label>
        <Input
          id={`new-${tipo}`}
          name="valor"
          required
          autoComplete="off"
          style={{ textTransform: "uppercase" }}
          placeholder={tipo === "DNI" ? "12345678Z" : "ES00 0000 0000 0000 0000 0000"}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : `Solicitar cambio de ${tipo}`}
      </Button>
    </form>
  );
}
