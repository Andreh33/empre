/**
 * Envio de email transaccional con Resend.
 *
 * En desarrollo (sin RESEND_API_KEY) hace log a consola en lugar de enviar.
 * Plantillas simples, mantenidas en este modulo para Fase 2. En fases
 * posteriores migrar a templates Resend o react-email si la complejidad crece.
 */
import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  if (!env.RESEND_API_KEY) return null;
  client = new Resend(env.RESEND_API_KEY);
  return client;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const c = getClient();
  if (!c) {
    console.warn("[mail] Resend no configurado; simulando envio:", { to, subject, text });
    return;
  }
  const { error } = await c.emails.send({
    from: `${env.APP_NAME} <${env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error("[mail] error enviando:", error);
    throw new Error("No se pudo enviar el email");
  }
}

// ---------------------------------------------------------------------
// Plantillas
// ---------------------------------------------------------------------
const baseStyles = `font-family:Inter,Arial,sans-serif;color:#0F2A47;background:#fff;padding:24px;max-width:600px;margin:0 auto;`;
const buttonStyles = `display:inline-block;background:#0F2A47;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;`;

export function emailVerificationTemplate(verifyUrl: string) {
  const text = `Bienvenido/a a ${env.APP_NAME}.\n\nConfirma tu email visitando este enlace (valido 1 hora):\n${verifyUrl}\n\nSi no has solicitado esta cuenta, ignora este mensaje.`;
  const html = `<div style="${baseStyles}">
    <h2>Confirma tu email</h2>
    <p>Bienvenido/a a <strong>${env.APP_NAME}</strong>. Pulsa el boton para confirmar tu direccion (enlace valido durante 1 hora):</p>
    <p><a href="${verifyUrl}" style="${buttonStyles}">Confirmar email</a></p>
    <p style="color:#666;font-size:12px">Si no has solicitado esta cuenta, ignora este mensaje. Por seguridad, este enlace expira en 1 hora.</p>
  </div>`;
  return { subject: `Confirma tu email - ${env.APP_NAME}`, text, html };
}

export function passwordResetTemplate(resetUrl: string) {
  const text = `Has solicitado restablecer tu contrasenya en ${env.APP_NAME}.\n\nEnlace (valido 30 min):\n${resetUrl}\n\nSi no has sido tu, cambia tu contrasenya inmediatamente y avisanos.`;
  const html = `<div style="${baseStyles}">
    <h2>Restablece tu contrasenya</h2>
    <p>Has solicitado restablecer tu contrasenya en <strong>${env.APP_NAME}</strong>. Pulsa el boton (enlace valido 30 min):</p>
    <p><a href="${resetUrl}" style="${buttonStyles}">Restablecer contrasenya</a></p>
    <p style="color:#666;font-size:12px">Si no has sido tu, ignora este email y avisanos. La contrasenya actual sigue funcionando.</p>
  </div>`;
  return { subject: `Restablece tu contrasenya - ${env.APP_NAME}`, text, html };
}

export function accountLockedTemplate(unlockAt: Date) {
  const fecha = unlockAt.toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  const text = `Tu cuenta en ${env.APP_NAME} ha sido bloqueada temporalmente por multiples intentos fallidos de inicio de sesion. Se desbloqueara automaticamente el ${fecha}. Si no has sido tu, contacta con la asesoria.`;
  const html = `<div style="${baseStyles}">
    <h2>Cuenta bloqueada temporalmente</h2>
    <p>Hemos detectado multiples intentos fallidos de inicio de sesion en tu cuenta.</p>
    <p>Por seguridad, la cuenta se ha bloqueado y se reactivara automaticamente el <strong>${fecha}</strong> (hora peninsular).</p>
    <p style="color:#666;font-size:12px">Si no has intentado iniciar sesion, contacta inmediatamente con la asesoria; alguien podria estar intentando acceder a tu cuenta.</p>
  </div>`;
  return { subject: `Aviso de seguridad - ${env.APP_NAME}`, text, html };
}
