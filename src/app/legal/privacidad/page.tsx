import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politica de privacidad" };

export default function PrivacidadLegalPage() {
  return (
    <article className="prose prose-sm max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Politica de privacidad</h1>
      <p>
        <strong>Plantilla orientativa.</strong> Esta plantilla cumple los minimos exigidos por el
        Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD 3/2018. Antes de usarla en produccion, debe
        ser revisada por abogado especializado en proteccion de datos.
      </p>
      <h2 className="text-lg font-semibold">1. Responsable del tratamiento</h2>
      <p>
        Asesoria Empresarial Juan Garcia S.L., con NIF [NIF a completar], domicilio social en
        [direccion completa], correo electronico de contacto: <em>[email]</em>, telefono <em>[telefono]</em>.
      </p>
      <h2 className="text-lg font-semibold">2. Datos que tratamos</h2>
      <ul className="list-disc pl-5">
        <li>Datos identificativos: nombre, apellidos, DNI/NIE/CIF, fecha de nacimiento.</li>
        <li>Datos de contacto: email, telefono, direccion postal.</li>
        <li>Datos economicos: IBAN, situacion laboral, profesion.</li>
        <li>Documentos fiscales subidos por el usuario.</li>
        <li>Datos tecnicos: IP, user-agent, registros de acceso (auditoria).</li>
      </ul>
      <h2 className="text-lg font-semibold">3. Finalidad y base juridica</h2>
      <p>
        Tratamos sus datos para ejecutar la relacion contractual de prestacion de servicios de
        asesoria fiscal y laboral (Art. 6.1.b RGPD) y para cumplir obligaciones legales tributarias
        (Art. 6.1.c RGPD). Las comunicaciones comerciales se basan en su consentimiento (Art.
        6.1.a) y son revocables.
      </p>
      <h2 className="text-lg font-semibold">4. Conservacion</h2>
      <p>
        Los datos personales generales se conservan mientras dure la relacion y, una vez finalizada,
        durante los plazos legales de prescripcion (general 5 anyos, fiscal hasta 6 anyos).
      </p>
      <h2 className="text-lg font-semibold">5. Destinatarios</h2>
      <p>
        Los datos son tratados exclusivamente por el responsable. Encargados del tratamiento:
        Vercel Inc. (alojamiento, region UE), Turso (BBDD, region UE), Resend (email), Cloudflare
        (CAPTCHA), Upstash (rate limiting), VirusTotal (antivirus). Todos cuentan con clausulas
        contractuales tipo aprobadas por la UE.
      </p>
      <h2 className="text-lg font-semibold">6. Derechos</h2>
      <p>
        Acceso, rectificacion, supresion, oposicion, limitacion, portabilidad y a no ser objeto de
        decisiones automatizadas. Ejercite sus derechos desde su panel privado o escribiendo a
        <em>[email]</em>. Tiene derecho a presentar reclamacion ante la AEPD (www.aepd.es).
      </p>
      <h2 className="text-lg font-semibold">7. Medidas de seguridad</h2>
      <p>
        Cifrado AES-256-GCM en reposo, TLS 1.3 en transito, autenticacion de doble factor opcional,
        registro de auditoria, control de acceso por rol y backups cifrados.
      </p>
    </article>
  );
}
