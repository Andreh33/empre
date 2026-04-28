"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  variant?: "client" | "admin";
}

export function LoginForm({ variant = "client" }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(fd);
      if (res.ok) {
        const role = res.data?.role;
        const target =
          callbackUrl ??
          (role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/panel/documentos");
        router.replace(target);
        router.refresh();
        return;
      }
      setError(res.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/recuperar"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            La he olvidado
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Accediendo..." : "Acceder"}
      </Button>

      {variant === "client" ? (
        <p className="text-center text-sm text-muted-foreground">
          Aun no tienes cuenta?{" "}
          <Link href="/registro" className="text-primary underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </p>
      ) : null}
    </form>
  );
}
