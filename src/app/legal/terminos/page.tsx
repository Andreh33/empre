import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terminos y condiciones" };

export default function TerminosPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-bold">Terminos y condiciones</h1>
      <p>
        El uso de la plataforma esta sujeto a la aceptacion de estos terminos por parte del usuario.
        El usuario se compromete a hacer un uso licito de la misma y a no interferir con su normal
        funcionamiento.
      </p>
      <h2 className="text-lg font-semibold">Servicios</h2>
      <p>
        La plataforma facilita la comunicacion y el intercambio documental entre el cliente y la
        asesoria. No sustituye al asesoramiento profesional personalizado.
      </p>
      <h2 className="text-lg font-semibold">Limitacion de responsabilidad</h2>
      <p>
        El titular no se hace responsable de los danyos derivados de un uso inadecuado, fuerza mayor
        o terceros. Pondra todos los medios razonables para garantizar la disponibilidad y
        seguridad del servicio.
      </p>
      <h2 className="text-lg font-semibold">Jurisdiccion</h2>
      <p>
        Estos terminos se rigen por la ley espanyola. Para cualquier controversia las partes se
        someten a los juzgados y tribunales del domicilio del titular.
      </p>
    </article>
  );
}
