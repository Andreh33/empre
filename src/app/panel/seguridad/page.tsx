import type { Metadata } from "next";
import { requireSession } from "@/lib/guards";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = { title: "Seguridad" };

export default async function SeguridadPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Seguridad de la cuenta</h1>
        <p className="text-sm text-muted-foreground">{session.user.email}</p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
          <p className="text-sm text-muted-foreground">
            Introduce tu contraseña actual y elige una nueva.
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
