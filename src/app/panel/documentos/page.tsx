import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { listFiles } from "@/services/files";
import { UploadZone } from "@/components/files/upload-zone";
import { FileList } from "@/components/files/file-list";
import { ZipDownloadButton } from "@/components/files/zip-download-button";

export const metadata: Metadata = { title: "Mis documentos" };

export default async function DocumentosPage() {
  const session = await requireClient();
  const files = await listFiles({ ownerId: session.user.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis documentos</h1>
        <p className="text-sm text-muted-foreground">
          Sube facturas, justificantes o cualquier documento que tu asesor necesite. Todo se cifra
          en nuestros servidores.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Subir archivos</h2>
        <UploadZone
          ownerId={session.user.id}
          caption="PDF, Word, Excel, JPG/PNG, ZIP. En movil puedes hacerle una foto a la factura."
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tus archivos</h2>
          <ZipDownloadButton ids={files.map((f) => f.id)} />
        </div>
        <FileList files={files} editable />
      </section>
    </div>
  );
}
