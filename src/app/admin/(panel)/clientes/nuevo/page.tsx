"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileForm } from "@/components/client/profile-form";
import { createClientAction } from "@/actions/admin-clients";
import type { ActionResult } from "@/actions/auth";

export default function NuevoClientePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onSubmit(fd: FormData): Promise<ActionResult> {
    setEmailError(null);
    setPasswordError(null);
    if (!email) {
      setEmailError("Introduce el email del cliente");
      return { ok: false, code: "VALIDATION", message: "Falta email" };
    }
    if (!password || password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return { ok: false, code: "VALIDATION", message: "Contraseña invalida" };
    }
    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return { ok: false, code: "VALIDATION", message: "Contraseñas distintas" };
    }
    fd.set("email", email);
    fd.set("password", password);
    fd.set("confirmPassword", confirmPassword);
    return new Promise<ActionResult>((resolve) => {
      startTransition(async () => {
        const res = await createClientAction(fd);
        if (res.ok) {
          // Tras crear, llevamos al admin al listado para ver el alta.
          router.push("/admin/clientes");
          router.refresh();
        }
        resolve(res);
      });
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Añadir cliente</h1>
        <p className="text-sm text-muted-foreground">
          Crea la cuenta del cliente con email y contraseña directos. Podrá entrar inmediatamente
          en su área privada para subir y descargar documentos.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Credenciales de acceso</h2>
          <p className="text-sm text-muted-foreground">
            Comparte estas credenciales con el cliente por el canal que prefieras (teléfono,
            mensaje, etc.). El cliente podrá cambiar su contraseña después.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email del cliente</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="text"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="off"
              minLength={6}
            />
            {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
          </div>
        </div>
      </section>

      <ProfileForm
        submitLabel="Crear cliente"
        successMessage="Cliente creado. Ya puede iniciar sesión."
        onSubmit={onSubmit}
      />

      <Link href="/admin/clientes" className="block text-sm text-muted-foreground hover:underline">
        Volver al listado
      </Link>
    </div>
  );
}
