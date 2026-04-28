"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Sparkles, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/client/profile-form";
import { createClientAction } from "@/actions/admin-clients";
import type { ActionResult } from "@/actions/auth";

function generateRandomPassword(length = 14) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buffer = new Uint32Array(length);
  crypto.getRandomValues(buffer);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += charset.charAt(buffer[i]! % charset.length);
  }
  return out;
}

export default function NuevoClientePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function generate() {
    const pw = generateRandomPassword(14);
    setPassword(pw);
    setConfirmPassword(pw);
    setShowPassword(true);
    setPasswordError(null);
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignorar — el navegador puede bloquear sin HTTPS o sin permisos.
    }
  }

  async function onSubmit(fd: FormData): Promise<ActionResult> {
    setEmailError(null);
    setPasswordError(null);
    if (!email) {
      setEmailError("Introduce el email del cliente");
      return { ok: false, code: "VALIDATION", message: "Falta email" };
    }
    if (!password || password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return { ok: false, code: "VALIDATION", message: "Contraseña inválida" };
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
          router.push("/admin/clientes");
          router.refresh();
        }
        resolve(res);
      });
    });
  }

  const inputType = showPassword ? "text" : "password";

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Credenciales de acceso</h2>
            <p className="text-sm text-muted-foreground">
              Comparte estas credenciales con el cliente por el canal que prefieras.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" size="sm" onClick={generate} className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generar contraseña
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyPassword}
              disabled={!password}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar
                </>
              )}
            </Button>
          </div>
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
            <div className="flex gap-2">
              <Input
                id="password"
                type={inputType}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                minLength={6}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type={inputType}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="off"
              minLength={6}
            />
            {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
            {password &&
            confirmPassword &&
            password === confirmPassword &&
            password.length >= 6 ? (
              <p className="text-xs text-emerald-600">Las contraseñas coinciden</p>
            ) : null}
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
