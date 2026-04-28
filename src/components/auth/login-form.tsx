"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Turnstile } from "./turnstile";

interface Props {
  turnstileSiteKey?: string;
}

export function LoginForm({ turnstileSiteKey }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [needsTwoFactorSetup, setNeedsTwoFactorSetup] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (captchaToken) fd.set("turnstileToken", captchaToken);
    startTransition(async () => {
      const res = await loginAction(fd);
      if (res.ok) {
        router.replace(callbackUrl);
        router.refresh();
        return;
      }
      switch (res.code) {
        case "TWO_FA_REQUIRED":
          setNeedsTotp(true);
          setError("Introduce el codigo de tu app autenticadora.");
          break;
        case "TWO_FA_INVALID":
          setNeedsTotp(true);
          setError(res.message);
          break;
        case "TWO_FA_SETUP_REQUIRED":
          setNeedsTwoFactorSetup(true);
          setError(res.message);
          break;
        case "EMAIL_NOT_VERIFIED":
          setNeedsEmailVerification(true);
          setError(res.message);
          break;
        default:
          setError(res.message);
      }
    });
  }

  if (needsTwoFactorSetup) {
    return (
      <div className="space-y-4 text-sm">
        <p className="rounded-md bg-destructive/10 p-3 text-destructive">{error}</p>
        <p>
          Como administrador necesitas configurar 2FA. Contacta con el SUPER_ADMIN para que active
          tu cuenta y proporcione acceso inicial.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contrasenya</Label>
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

      {needsTotp ? (
        <div className="space-y-2">
          <Label htmlFor="totpCode">Codigo 2FA</Label>
          <Input
            id="totpCode"
            name="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
          />
        </div>
      ) : null}

      <Turnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} />

      {error && !needsTwoFactorSetup ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
          {needsEmailVerification ? (
            <>
              {" "}
              <Link href="/recuperar" className="underline">
                Reenviar verificacion
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Accediendo..." : "Acceder"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Aun no tienes cuenta?{" "}
        <Link href="/registro" className="text-primary underline-offset-4 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
