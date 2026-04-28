"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileForm } from "@/components/client/profile-form";
import { inviteClientAction } from "@/actions/admin-clients";
import type { ActionResult } from "@/actions/auth";

export default function NuevoClientePage() {
  const [email, setEmail] = useState("");
  const [, startTransition] = useTransition();

  // Wrapper que inyecta el email en el FormData antes de invocar la accion.
  async function onSubmit(fd: FormData): Promise<ActionResult> {
    fd.set("email", email);
    return new Promise<ActionResult>((resolve) => {
      startTransition(async () => {
        resolve(await inviteClientAction(fd));
      });
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Anyadir cliente</h1>
        <p className="text-sm text-muted-foreground">
          Crearemos la cuenta y enviaremos un email de invitacion para que el cliente elija su
          contrasenya. El enlace caduca en 24 horas.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email del cliente</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
      </div>

      <ProfileForm
        submitLabel="Crear cliente y enviar invitacion"
        successMessage="Cliente creado. Invitacion enviada al email."
        onSubmit={onSubmit}
      />

      <Link href="/admin/clientes" className="block text-sm text-muted-foreground hover:underline">
        Volver al listado
      </Link>
    </div>
  );
}
