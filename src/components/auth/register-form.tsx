"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerAction(fd);
      if (res.ok) {
        router.replace("/panel/documentos");
        router.refresh();
        return;
      }
      setError(res.message);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {fieldErrors.email?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">Minimo 6 caracteres.</p>
        {fieldErrors.password?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repite la contraseña</Label>
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

      <div className="space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="privacyConsent" required className="mt-1" />
          <span>
            He leido y acepto la{" "}
            <Link href="/legal/privacidad" className="text-primary underline" target="_blank">
              politica de privacidad
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="termsConsent" required className="mt-1" />
          <span>
            Acepto los{" "}
            <Link href="/legal/terminos" className="text-primary underline" target="_blank">
              terminos y condiciones
            </Link>
            .
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Acceder
        </Link>
      </p>
    </form>
  );
}
