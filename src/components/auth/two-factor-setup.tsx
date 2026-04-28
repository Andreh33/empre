"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { confirmTwoFactorSetupAction, startTwoFactorSetupAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function TwoFactorSetup() {
  const [step, setStep] = useState<"intro" | "scan" | "done">("intro");
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function start() {
    setError(null);
    startTransition(async () => {
      const res = await startTwoFactorSetupAction();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSecret(res.data!.secret);
      setQr(res.data!.qrDataUrl);
      setStep("scan");
    });
  }

  function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await confirmTwoFactorSetupAction(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setStep("done");
    });
  }

  if (step === "intro") {
    return (
      <div className="space-y-4 text-sm">
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Instala una app autenticadora (Google Authenticator, Authy, 1Password).</li>
          <li>Pulsa el boton para generar tu codigo QR.</li>
          <li>Escanealo con la app y guarda el codigo de respaldo en lugar seguro.</li>
          <li>Introduce el codigo de 6 digitos para confirmar.</li>
        </ol>
        {error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}
        <Button onClick={start} disabled={isPending} className="w-full">
          {isPending ? "Generando..." : "Activar 2FA"}
        </Button>
      </div>
    );
  }

  if (step === "scan" && qr && secret) {
    return (
      <form onSubmit={onConfirm} className="space-y-4 text-sm">
        <div className="flex flex-col items-center gap-3">
          <Image
            src={qr}
            alt="Codigo QR para 2FA"
            width={220}
            height={220}
            unoptimized
            className="rounded-md border border-border"
          />
          <p className="text-xs text-muted-foreground">
            Si no puedes escanear, introduce manualmente este codigo:
          </p>
          <code className="select-all break-all rounded bg-muted px-2 py-1 font-mono text-xs">
            {secret}
          </code>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Codigo de 6 digitos</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
          />
        </div>
        {error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Verificando..." : "Confirmar 2FA"}
        </Button>
      </form>
    );
  }

  return (
    <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
      2FA activado correctamente. La proxima vez que accedas, te pediremos el codigo.
    </p>
  );
}
