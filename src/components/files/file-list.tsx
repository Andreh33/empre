import Link from "next/link";
import type { FileRecord } from "@/db/schema";
import { CategoriaSelect, DeleteFileButton, EstadoSelect } from "./file-row-actions";

interface Props {
  files: FileRecord[];
  /** true = mostrar selectors editables (admin). */
  editable?: boolean;
  /** Clase visual extra para diferenciar fuentes (admin/cliente). */
  variant?: "default" | "client-uploads";
}

const PREVIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
}

export function FileList({ files, editable = false, variant = "default" }: Props) {
  if (files.length === 0) {
    return (
      <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Sin archivos.
      </p>
    );
  }

  const rowClass = variant === "client-uploads" ? "border-l-4 border-l-gold" : "";

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Archivo</th>
            <th className="hidden p-3 md:table-cell">Categoria</th>
            <th className="hidden p-3 md:table-cell">Estado</th>
            <th className="hidden p-3 md:table-cell">Subido</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id} className={`border-t ${rowClass}`}>
              <td className="p-3">
                <p className="font-medium">{f.nombreOriginal}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtSize(f.tamanoBytes)}
                  {f.antivirusStatus !== "CLEAN" && f.antivirusStatus !== "PENDING" ? (
                    <span className="ml-2 rounded bg-destructive/10 px-1 text-destructive">
                      AV: {f.antivirusStatus}
                    </span>
                  ) : null}
                  {f.antivirusStatus === "PENDING" ? (
                    <span className="ml-2 rounded bg-yellow-100 px-1 text-yellow-900">
                      AV: pendiente
                    </span>
                  ) : null}
                </p>
                {f.mensajeAdjunto ? (
                  <p className="mt-1 rounded bg-muted/50 p-2 text-xs italic">
                    "{f.mensajeAdjunto}"
                  </p>
                ) : null}
              </td>
              <td className="hidden p-3 md:table-cell">
                {editable ? (
                  <CategoriaSelect fileId={f.id} value={f.categoria} />
                ) : (
                  <span className="text-xs">{f.categoria.replace("_", " ").toLowerCase()}</span>
                )}
              </td>
              <td className="hidden p-3 md:table-cell">
                {editable ? (
                  <EstadoSelect fileId={f.id} value={f.estado} />
                ) : (
                  <span className="text-xs">{f.estado.toLowerCase()}</span>
                )}
              </td>
              <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">
                {fmtDate(f.createdAt)}
              </td>
              <td className="p-3 text-right">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {PREVIEWABLE.has(f.mimeType) ? (
                    <Link
                      target="_blank"
                      href={`/api/files/${f.id}?disposition=inline`}
                      className="text-xs text-primary underline"
                    >
                      Ver
                    </Link>
                  ) : null}
                  <Link
                    href={`/api/files/${f.id}`}
                    className="text-xs text-primary underline"
                  >
                    Descargar
                  </Link>
                  {editable ? <DeleteFileButton id={f.id} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
