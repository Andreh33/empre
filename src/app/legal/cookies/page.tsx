import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politica de cookies" };

export default function CookiesPage() {
  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-bold">Politica de cookies</h1>
      <p>
        Utilizamos solo cookies estrictamente necesarias para el funcionamiento de la plataforma,
        salvo que el usuario otorgue consentimiento explicito a las opcionales.
      </p>
      <h2 className="text-lg font-semibold">Cookies utilizadas</h2>
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="p-2">Nombre</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Finalidad</th>
            <th className="p-2">Duracion</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-2 font-mono">__Secure-asesoria.session-token</td>
            <td className="p-2">Necesaria</td>
            <td className="p-2">Mantener la sesion del usuario tras login</td>
            <td className="p-2">15 min inactividad / 8 h max</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 font-mono">authjs.csrf-token</td>
            <td className="p-2">Necesaria</td>
            <td className="p-2">Proteccion frente a CSRF</td>
            <td className="p-2">Sesion</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 font-mono">cf_clearance</td>
            <td className="p-2">Necesaria</td>
            <td className="p-2">Verificacion CAPTCHA Turnstile</td>
            <td className="p-2">30 dias</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 font-mono">asesoria.cookies.v1</td>
            <td className="p-2">Necesaria</td>
            <td className="p-2">Almacenar tu preferencia de cookies</td>
            <td className="p-2">12 meses</td>
          </tr>
        </tbody>
      </table>
      <p>
        Puedes revisar o revocar tu consentimiento en cualquier momento desde el banner inferior o
        borrando las cookies del navegador.
      </p>
    </article>
  );
}
