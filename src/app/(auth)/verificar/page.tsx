import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { verifyEmailAction } from "@/actions/auth";

export const metadata: Metadata = { title: "Verificar email" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerificarPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Enlace incompleto" subtitle="Falta el token de verificacion.">
        <Link href="/login" className="block text-center text-primary underline">
          Volver al login
        </Link>
      </AuthCard>
    );
  }

  const fd = new FormData();
  fd.set("token", token);
  const result = await verifyEmailAction(fd);

  if (result.ok) {
    return (
      <AuthCard title="Email verificado" subtitle="Tu cuenta esta lista para usar.">
        <Link
          href="/login"
          className="block rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
        >
          Ir al login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="No se pudo verificar" subtitle={result.message}>
      <Link href="/login" className="block text-center text-primary underline">
        Volver al login
      </Link>
    </AuthCard>
  );
}
