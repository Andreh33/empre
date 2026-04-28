import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace al email registrado (caduca en 30 min)."
    >
      <RequestResetForm />
    </AuthCard>
  );
}
