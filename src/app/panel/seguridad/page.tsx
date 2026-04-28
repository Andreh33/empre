import type { Metadata } from "next";
import { requireSession } from "@/lib/guards";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

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
          <h2 className="text-lg font-semibold">Autenticacion en dos pasos (2FA)</h2>
          <p className="text-sm text-muted-foreground">
            Anyade una capa adicional. Necesitaras una app autenticadora.
          </p>
        </div>
        {session.user.twoFactorEnabled ? (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            2FA activado. Si pierdes acceso a la app, contacta con la asesoria.
          </p>
        ) : (
          <TwoFactorSetup />
        )}
      </section>
    </div>
  );
}
