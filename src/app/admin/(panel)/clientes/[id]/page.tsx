import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { getProfileByUserId } from "@/services/client-profile";
import { ClientEdit } from "@/components/admin/client-edit";

export const metadata: Metadata = { title: "Ficha de cliente" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteFichaPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      emailVerified: schema.users.emailVerified,
      createdAt: schema.users.createdAt,
      twoFactorEnabled: schema.users.twoFactorEnabled,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  if (!user || user.role !== "CLIENT") notFound();
  const profile = await getProfileByUserId(id);
  if (!profile) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">Cliente sin perfil</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} aun no ha completado el alta de su perfil.
        </p>
        <Link href="/admin/clientes" className="text-primary underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.apellidos}, {profile.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Link href="/admin/clientes" className="text-sm text-muted-foreground hover:underline">
          Volver
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Tipo</p>
          <p className="font-semibold">{profile.tipoCliente}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email verificado</p>
          <p className="font-semibold">{user.emailVerified ? "Si" : "No"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">2FA</p>
          <p className="font-semibold">{user.twoFactorEnabled ? "Activo" : "Inactivo"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/clientes/${user.id}/documentos`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Documentos
        </Link>
        <Link
          href={`/admin/clientes/${user.id}/chat`}
          className="rounded-md border border-input px-4 py-2 text-sm font-semibold"
        >
          Chat
        </Link>
        <Link
          href={`/admin/clientes/${user.id}/calendario`}
          className="rounded-md border border-input px-4 py-2 text-sm font-semibold"
        >
          Calendario
        </Link>
        <Link
          href={`/admin/clientes/${user.id}/notas`}
          className="rounded-md border border-input px-4 py-2 text-sm font-semibold"
        >
          Notas internas
        </Link>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Editar datos</h2>
        <ClientEdit profile={profile} clientUserId={user.id} />
      </section>
    </div>
  );
}
