import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso legal" };

export default function AvisoLegalPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-bold">Aviso legal</h1>
      <p>
        <strong>Titular:</strong> Asesoria Empresarial Juan Garcia S.L.
      </p>
      <p>
        <strong>NIF:</strong> [NIF a completar]
      </p>
      <p>
        <strong>Domicilio social:</strong> [direccion completa]
      </p>
      <p>
        <strong>Email:</strong> [email] · <strong>Telefono:</strong> [telefono]
      </p>
      <p>
        <strong>Datos registrales:</strong> Inscrita en el Registro Mercantil de [provincia], tomo
        [n], folio [n], hoja [n].
      </p>
      <h2 className="text-lg font-semibold">Condiciones de uso</h2>
      <p>
        El acceso y uso de esta plataforma implica la aceptacion plena de las condiciones aqui
        recogidas y el cumplimiento de la LSSI-CE (Ley 34/2002).
      </p>
      <h2 className="text-lg font-semibold">Propiedad intelectual</h2>
      <p>
        Todos los contenidos son propiedad del titular salvo indicacion expresa, y estan protegidos
        por las leyes vigentes en materia de propiedad intelectual e industrial.
      </p>
    </article>
  );
}
