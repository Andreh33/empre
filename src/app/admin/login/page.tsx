import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Acceso administrador" };

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Acceso administrador"
      subtitle="Solo para personal autorizado de la asesoria."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <LoginForm variant="admin" />
      </Suspense>
    </AuthCard>
  );
}
