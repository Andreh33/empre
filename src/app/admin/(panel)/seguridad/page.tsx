import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";

export const metadata: Metadata = { title: "Seguridad" };

export default async function AdminSeguridadPage() {
  const session = await requireAdmin();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Seguridad de mi cuenta</h1>
      <p className="text-sm text-muted-foreground">{session.user.email}</p>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Si necesitas cambiar tu contraseña usa el flujo de recuperacion desde el login.
        </p>
      </section>
    </div>
  );
}
