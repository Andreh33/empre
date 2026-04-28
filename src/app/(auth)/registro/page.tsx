import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="En 1 minuto. Empezaras a usar tu area privada al instante."
    >
      <RegisterForm />
    </AuthCard>
  );
}
