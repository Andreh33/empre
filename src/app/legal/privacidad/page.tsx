import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadLegalPage() {
  return (
    <article className="prose prose-sm max-w-none space-y-4">
      <h1 className="text-2xl font-bold">Política de privacidad</h1>
      <p>
        <strong>Plantilla orientativa.</strong> Esta plantilla cumple los mínimos exigidos por el
        Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD 3/2018. Antes de usarla en producción, debe
        ser revisada por abogado especializado en protección de datos.
      </p>
      <h2 className="text-lg font-semibold">1. Responsable del tratamiento</h2>
      <p>
        Asesoría Empresarial Juan García S.L., con NIF [NIF a completar], domicilio social en
        [dirección completa], correo electrónico de contacto: <em>[email]</em>, teléfono <em>[teléfono]</em>.
      </p>
      <h2 className="text-lg font-semibold">2. Datos que tratamos</h2>
      <ul className="list-disc pl-5">
        <li>Datos identificativos: nombre, apellidos, DNI/NIE/CIF, fecha de nacimiento.</li>
        <li>Datos de contacto: email, teléfono, dirección postal.</li>
        <li>Datos económicos: IBAN, situación laboral, profesión.</li>
        <li>Documentos fiscales subidos por el usuario.</li>
        <li>Datos técnicos: IP, user-agent, registros de acceso (auditoría).</li>
      </ul>
      <h2 className="text-lg font-semibold">3. Finalidad y base jurídica</h2>
      <p>
        Tratamos sus datos para ejecutar la relación contractual de prestación de servicios de
        asesoría fiscal y laboral (Art. 6.1.b RGPD) y para cumplir obligaciones legales tributarias
        (Art. 6.1.c RGPD). Las comunicaciones comerciales se basan en su consentimiento (Art.
        6.1.a) y son revocables.
      </p>
      <h2 className="text-lg font-semibold">4. Conservación</h2>
      <p>
        Los datos personales generales se conservan mientras dure la relación y, una vez finalizada,
        durante los plazos legales de prescripción (general 5 años, fiscal hasta 6 años).
      </p>
      <h2 className="text-lg font-semibold">5. Destinatarios</h2>
      <p>
        Los datos son tratados exclusivamente por el responsable. Encargados del tratamiento:
        Vercel Inc. (alojamiento, región UE), Turso (BBDD, región UE), Resend (email), Upstash
        (rate limiting), VirusTotal (antivirus). Todos cuentan con cláusulas contractuales tipo
        aprobadas por la UE.
      </p>
      <h2 className="text-lg font-semibold">6. Derechos</h2>
      <p>
        Acceso, rectificación, supresión, oposición, limitación, portabilidad y a no ser objeto de
        decisiones automatizadas. Ejercite sus derechos desde su panel privado o escribiendo a
        <em>[email]</em>. Tiene derecho a presentar reclamación ante la AEPD (www.aepd.es).
      </p>
      <h2 className="text-lg font-semibold">7. Medidas de seguridad</h2>
      <p>
        Cifrado AES-256-GCM en reposo, TLS 1.3 en tránsito, registro de auditoría, control de
        acceso por rol y backups cifrados.
      </p>
    </article>
  );
}
