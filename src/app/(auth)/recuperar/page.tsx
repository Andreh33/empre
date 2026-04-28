import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/password-recovery-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Recuperar contrasenya" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar contrasenya"
      subtitle="Te enviaremos un enlace al email registrado (caduca en 30 min)."
    >
      <RequestResetForm turnstileSiteKey={env.TURNSTILE_SITE_KEY || undefined} />
    </AuthCard>
  );
}
