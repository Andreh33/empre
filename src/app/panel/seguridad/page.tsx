import type { Metadata } from "next";
import { requireSession } from "@/lib/guards";

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
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Si necesitas cambiar tu contraseña usa el flujo &quot;La he olvidado&quot; desde la pagina
          de acceso.
        </p>
      </section>
    </div>
  );
}
