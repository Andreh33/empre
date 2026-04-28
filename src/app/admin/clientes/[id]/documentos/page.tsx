import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { listClientUploads, listFiles } from "@/services/files";
import { UploadZone } from "@/components/files/upload-zone";
import { FileList } from "@/components/files/file-list";
import { ZipDownloadButton } from "@/components/files/zip-download-button";
import { getProfileByUserId } from "@/services/client-profile";

export const metadata: Metadata = { title: "Documentos del cliente" };

export default async function ClienteDocumentos({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!user || user.role !== "CLIENT") notFound();

  const profile = await getProfileByUserId(id);
  const allFiles = await listFiles({ ownerId: id });
  const clientUploads = await listClientUploads(id);
  const adminFiles = allFiles.filter((f) => f.uploadedById !== id);
  const nombreCliente = profile ? `${profile.nombre} ${profile.apellidos}` : user.email;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Documentos</p>
        <h1 className="text-2xl font-bold">{nombreCliente}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <Link
          href={`/admin/clientes/${id}`}
          className="mt-2 inline-block text-sm text-muted-foreground hover:underline"
        >
          Volver a la ficha
        </Link>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Subir documentos al cliente</h2>
        <UploadZone
          ownerId={id}
          allowMessage
          caption="El mensaje se envia al cliente y queda asociado a este lote."
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Archivos para el cliente</h2>
          <ZipDownloadButton ids={adminFiles.map((f) => f.id)} />
        </div>
        <FileList files={adminFiles} editable />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Archivos de {profile?.nombre ?? "este cliente"}
          </h2>
          <span className="text-xs text-muted-foreground">
            (Subidos por el cliente — los identificas con el borde dorado.)
          </span>
        </div>
        <FileList files={clientUploads} editable variant="client-uploads" />
      </section>
    </div>
  );
}
