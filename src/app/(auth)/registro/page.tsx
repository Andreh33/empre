import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="En 1 minuto. Te enviaremos un email para verificar tu identidad."
    >
      <RegisterForm turnstileSiteKey={env.TURNSTILE_SITE_KEY || undefined} />
    </AuthCard>
  );
}
