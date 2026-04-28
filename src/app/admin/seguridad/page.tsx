import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

export const metadata: Metadata = { title: "Seguridad" };

export default async function AdminSeguridadPage() {
  const session = await requireAdmin();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Seguridad de mi cuenta</h1>
      <p className="text-sm text-muted-foreground">{session.user.email}</p>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">2FA (obligatorio para administradores)</h2>
        </div>
        {session.user.twoFactorEnabled ? (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">2FA activo.</p>
        ) : (
          <TwoFactorSetup />
        )}
      </section>
    </div>
  );
}
