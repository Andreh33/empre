"use client";

import { ProfileForm } from "@/components/client/profile-form";
import { adminUpdateProfileAction } from "@/actions/admin-clients";
import type { DecryptedClientProfile } from "@/services/client-profile";

export function ClientEdit({
  profile,
  clientUserId,
}: {
  profile: DecryptedClientProfile;
  clientUserId: string;
}) {
  return (
    <ProfileForm
      submitLabel="Guardar cambios"
      successMessage="Cliente actualizado."
      extraHidden={{ userId: clientUserId }}
      onSubmit={adminUpdateProfileAction}
      initial={{
        nombre: profile.nombre,
        apellidos: profile.apellidos,
        dni: profile.dni,
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
        iban: profile.iban ?? "",
        tipoCliente: profile.tipoCliente,
        cif: profile.cif ?? "",
        razonSocial: profile.razonSocial ?? "",
        formaJuridica: profile.formaJuridica ?? "",
        domicilioFiscal: profile.domicilioFiscal ?? "",
      }}
    />
  );
}
