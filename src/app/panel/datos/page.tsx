import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { getProfileByUserId } from "@/services/client-profile";
import { ProfileForm } from "@/components/client/profile-form";
import { SensitiveChangeForm } from "@/components/client/sensitive-change-form";
import { createOrUpdateProfileAction } from "@/actions/profile";

export const metadata: Metadata = { title: "Mis datos" };

function maskDni(dni: string) {
  if (dni.length < 4) return "***";
  return `${dni.slice(0, 2)}*****${dni.slice(-1)}`;
}
function maskIban(iban: string) {
  if (iban.length < 8) return "***";
  return `${iban.slice(0, 4)} **** **** **** **** ${iban.slice(-4)}`;
}

export default async function MisDatosPage() {
  const session = await requireClient();
  const profile = await getProfileByUserId(session.user.id);
  if (!profile) redirect("/panel/onboarding");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Mis datos</h1>
        <p className="text-sm text-muted-foreground">
          Mantenemos tu informacion cifrada. Los cambios de DNI/NIE e IBAN requieren confirmacion
          por email para mayor seguridad.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Datos sensibles</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">DNI / NIE actual</span>
            <code className="rounded bg-muted px-2 py-1 text-xs">{maskDni(profile.dni)}</code>
          </div>
          {profile.iban ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">IBAN actual</span>
              <code className="rounded bg-muted px-2 py-1 text-xs">{maskIban(profile.iban)}</code>
            </div>
          ) : null}
        </div>
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Cambiar mi DNI/NIE</summary>
          <div className="mt-3">
            <SensitiveChangeForm tipo="DNI" />
          </div>
        </details>
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Cambiar mi IBAN</summary>
          <div className="mt-3">
            <SensitiveChangeForm tipo="IBAN" />
          </div>
        </details>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Resto de datos</h2>
        <ProfileForm
          submitLabel="Guardar cambios"
          successMessage="Datos actualizados."
          hideSensitive
          initial={{
            nombre: profile.nombre,
            apellidos: profile.apellidos,
            telefono: profile.telefono,
            fechaNacimiento: profile.fechaNacimiento,
            calle: profile.calle,
            numero: profile.numero,
            piso: profile.piso ?? "",
            codigoPostal: profile.codigoPostal,
            ciudad: profile.ciudad,
            provincia: profile.provincia,
            pais: profile.pais,
            estadoCivil: profile.estadoCivil ?? "",
            profesion: profile.profesion ?? "",
            situacionLaboral: profile.situacionLaboral ?? "",
            nss: profile.nss ?? "",
            tipoCliente: profile.tipoCliente,
            cif: profile.cif ?? "",
            razonSocial: profile.razonSocial ?? "",
            formaJuridica: profile.formaJuridica ?? "",
            domicilioFiscal: profile.domicilioFiscal ?? "",
          }}
          onSubmit={createOrUpdateProfileAction}
        />
      </section>
    </div>
  );
}
