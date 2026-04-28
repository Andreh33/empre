"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmNewPassword = String(fd.get("confirmNewPassword") ?? "");
    if (newPassword !== confirmNewPassword) {
      setFieldErrors({ confirmNewPassword: ["Las contraseñas no coinciden"] });
      return;
    }
    startTransition(async () => {
      const res = await changePasswordAction(fd);
      if (res.ok) {
        setDone(true);
        (e.target as HTMLFormElement).reset();
        return;
      }
      setError(res.message);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldErrors.currentPassword?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.currentPassword[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
        {fieldErrors.newPassword?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.newPassword[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirmar nueva contraseña</Label>
        <Input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        {fieldErrors.confirmNewPassword?.[0] ? (
          <p className="text-xs text-destructive">{fieldErrors.confirmNewPassword[0]}</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {done ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          Contraseña actualizada correctamente.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
