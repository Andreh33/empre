import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";

export const metadata: Metadata = { title: "Documentos" };

interface RecentRow {
  id: string;
  nombreOriginal: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerNombre: string | null;
  ownerApellidos: string | null;
  uploadedById: string;
  createdAt: string;
  categoria: string;
  estado: string;
  antivirusStatus: string;
}

interface ClientRow {
  ownerId: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  total: number;
  pendientes: number;
}

export default async function AdminDocumentosPage() {
  await requireAdmin();

  const recent = (await db
    .select({
      id: schema.files.id,
      nombreOriginal: schema.files.nombreOriginal,
      ownerId: schema.files.ownerId,
      ownerEmail: schema.users.email,
      ownerNombre: schema.clientProfiles.nombre,
      ownerApellidos: schema.clientProfiles.apellidos,
      uploadedById: schema.files.uploadedById,
      createdAt: schema.files.createdAt,
      categoria: schema.files.categoria,
      estado: schema.files.estado,
      antivirusStatus: schema.files.antivirusStatus,
    })
    .from(schema.files)
    .leftJoin(schema.users, eq(schema.users.id, schema.files.ownerId))
    .leftJoin(schema.clientProfiles, eq(schema.clientProfiles.userId, schema.files.ownerId))
    .where(isNull(schema.files.deletedAt))
    .orderBy(desc(schema.files.createdAt))
    .limit(20)) as RecentRow[];

  const perClient = (await db
    .select({
      ownerId: schema.files.ownerId,
      email: schema.users.email,
      nombre: schema.clientProfiles.nombre,
      apellidos: schema.clientProfiles.apellidos,
      total: sql<number>`count(*)`,
      pendientes: sql<number>`sum(case when ${schema.files.estado} = 'PENDIENTE' then 1 else 0 end)`,
    })
    .from(schema.files)
    .leftJoin(schema.users, eq(schema.users.id, schema.files.ownerId))
    .leftJoin(schema.clientProfiles, eq(schema.clientProfiles.userId, schema.files.ownerId))
    .where(isNull(schema.files.deletedAt))
    .groupBy(
      schema.files.ownerId,
      schema.users.email,
      schema.clientProfiles.nombre,
      schema.clientProfiles.apellidos,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(50)) as ClientRow[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Vista global de archivos de todos los clientes. Para subir o gestionar archivos entra en
          la ficha del cliente correspondiente.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Subidas recientes</h2>
          <span className="text-xs text-muted-foreground">Ultimos 20 archivos</span>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Archivo</th>
                <th className="p-3">Cliente</th>
                <th className="hidden p-3 md:table-cell">Categoria</th>
                <th className="p-3">Estado</th>
                <th className="hidden p-3 md:table-cell">Antivirus</th>
                <th className="hidden p-3 md:table-cell">Subido por</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Aun no se han subido archivos.
                  </td>
                </tr>
              ) : (
                recent.map((f) => {
                  const nombre =
                    f.ownerNombre && f.ownerApellidos
                      ? `${f.ownerApellidos}, ${f.ownerNombre}`
                      : f.ownerEmail ?? f.ownerId;
                  const subidoPorCliente = f.uploadedById === f.ownerId;
                  return (
                    <tr key={f.id} className="border-t">
                      <td className="p-3 font-medium">{f.nombreOriginal}</td>
                      <td className="p-3 text-muted-foreground">{nombre}</td>
                      <td className="hidden p-3 text-xs uppercase md:table-cell">
                        {f.categoria}
                      </td>
                      <td className="p-3 text-xs uppercase">{f.estado}</td>
                      <td className="hidden p-3 text-xs uppercase md:table-cell">
                        {f.antivirusStatus}
                      </td>
                      <td className="hidden p-3 text-xs md:table-cell">
                        {subidoPorCliente ? (
                          <span className="rounded-full bg-gold/30 px-2 py-0.5">Cliente</span>
                        ) : (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                            Asesoria
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/clientes/${f.ownerId}/documentos`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Por cliente</h2>
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Total</th>
                <th className="p-3">Pendientes</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {perClient.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Sin datos.
                  </td>
                </tr>
              ) : (
                perClient.map((c) => {
                  const nombre =
                    c.nombre && c.apellidos
                      ? `${c.apellidos}, ${c.nombre}`
                      : c.email ?? c.ownerId;
                  return (
                    <tr key={c.ownerId} className="border-t">
                      <td className="p-3 font-medium">{nombre}</td>
                      <td className="p-3">{c.total}</td>
                      <td className="p-3">
                        {c.pendientes > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            {c.pendientes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/clientes/${c.ownerId}/documentos`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Gestionar
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
