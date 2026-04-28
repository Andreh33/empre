import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ConfirmResetForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ConfirmarPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Enlace invalido" subtitle="Falta el token.">
        <Link href="/recuperar" className="block text-center text-primary underline">
          Solicitar nuevo enlace
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elige una clave robusta.">
      <ConfirmResetForm token={token} />
    </AuthCard>
  );
}
