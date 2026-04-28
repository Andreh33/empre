"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction, confirmPasswordResetAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Turnstile } from "./turnstile";

export function RequestResetForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (captchaToken) fd.set("turnstileToken", captchaToken);
    startTransition(async () => {
      const res = await requestPasswordResetAction(fd);
      if (res.ok) setDone(true);
      else setError(res.message);
    });
  }

  if (done) {
    return (
      <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
        Si esa direccion existe en nuestros sistemas, recibiras un email con instrucciones en breve.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Turnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} />
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar enlace de recuperacion"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">
          Volver al login
        </Link>
      </p>
    </form>
  );
}

export function ConfirmResetForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    startTransition(async () => {
      const res = await confirmPasswordResetAction(fd);
      if (res.ok) setDone(true);
      else {
        setError(res.message);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-4 text-sm">
        <p className="rounded-md bg-emerald-50 p-3 text-emerald-900">
          Contrasenya actualizada. Ya puedes iniciar sesion.
        </p>
        <Link href="/login" className="block text-center text-primary underline">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contrasenya</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        {fieldErrors.password?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repite la contrasenya</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {fieldErrors.confirmPassword?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword[0]}</p>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar contrasenya"}
      </Button>
    </form>
  );
}
