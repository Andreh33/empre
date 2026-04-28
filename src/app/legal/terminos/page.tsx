import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-bold">Términos y condiciones</h1>
      <p>
        El uso de la plataforma está sujeto a la aceptación de estos términos por parte del usuario.
        El usuario se compromete a hacer un uso lícito de la misma y a no interferir con su normal
        funcionamiento.
      </p>
      <h2 className="text-lg font-semibold">Servicios</h2>
      <p>
        La plataforma facilita la comunicación y el intercambio documental entre el cliente y la
        asesoría. No sustituye al asesoramiento profesional personalizado.
      </p>
      <h2 className="text-lg font-semibold">Limitación de responsabilidad</h2>
      <p>
        El titular no se hace responsable de los daños derivados de un uso inadecuado, fuerza mayor
        o terceros. Pondrá todos los medios razonables para garantizar la disponibilidad y
        seguridad del servicio.
      </p>
      <h2 className="text-lg font-semibold">Jurisdicción</h2>
      <p>
        Estos términos se rigen por la ley española. Para cualquier controversia las partes se
        someten a los juzgados y tribunales del domicilio del titular.
      </p>
    </article>
  );
}
