import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Acceder" };

export default function LoginPage() {
  return (
    <AuthCard title="Bienvenido/a" subtitle="Accede a tu area privada para continuar.">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <LoginForm turnstileSiteKey={env.TURNSTILE_SITE_KEY || undefined} />
      </Suspense>
    </AuthCard>
  );
}
