import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { RequestDeletionForm } from "./request-deletion-form";

export const metadata: Metadata = { title: "Mi privacidad" };

export default async function PrivacidadPage() {
  await requireClient();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi privacidad</h1>
        <p className="text-sm text-muted-foreground">
          Ejerce tus derechos RGPD: acceso, portabilidad y supresion.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Descargar mis datos (Art. 15)</h2>
        <p className="text-sm text-muted-foreground">
          Genera un ZIP con todos tus datos en JSON + tus archivos descifrados.
        </p>
        <a
          href="/api/rgpd/export"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Descargar mis datos
        </a>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Solicitar baja (Art. 17)</h2>
        <p className="text-sm text-muted-foreground">
          Tu cuenta se desactivara inmediatamente y tus datos personales se eliminaran
          definitivamente tras 7 dias. Documentos con obligacion legal de conservacion fiscal se
          mantienen el plazo legal (4-6 años), separados y solo accesibles a la asesoría.
        </p>
        <RequestDeletionForm />
      </section>
    </div>
  );
}
