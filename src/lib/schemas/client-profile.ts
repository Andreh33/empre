/**
 * Schemas Zod del perfil de cliente. Compartidos entre cliente y servidor.
 *
 * Notas:
 * - Usamos z.preprocess con `emptyToUndefined` en los enums opcionales para
 *   que el formulario pueda enviar "" sin romper la validacion y, al mismo
 *   tiempo, conservar los tipos literales en la salida (necesario para
 *   columnas Drizzle con `enum`).
 */
import { z } from "zod";
import {
  ESTADOS_CIVILES,
  FORMAS_JURIDICAS,
  SITUACIONES_LABORALES,
  TIPOS_CLIENTE,
} from "@/db/schema";
import { detectAndValidate, isValidIBAN_ES } from "@/lib/spanish-id";
import { PROVINCIAS_LIST } from "@/lib/provincias";

const trimmed = () => z.string().trim();

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim().length === 0 ? undefined : v;

// Campos obligatorios pero potencialmente vacios desde el form: aplican
// preprocess para tratar "" como ausente y dejar que el `min(1)` o el `enum`
// fallen con el mensaje apropiado.

// Identificadores espanyoles.
const dniNieSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => {
    const r = detectAndValidate(v);
    return r.valid && (r.kind === "DNI" || r.kind === "NIE");
  }, "DNI/NIE invalido (revisa la letra de control)");

const cifSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => {
    const r = detectAndValidate(v);
    return r.valid && r.kind === "CIF";
  }, "CIF invalido (revisa la letra/digito de control)");

const ibanSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine(isValidIBAN_ES, "IBAN espanyol invalido");

const nssSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s/-]/g, ""))
  .pipe(z.string().regex(/^\d{12}$/, "Numero de Seguridad Social invalido (12 digitos)"));

const telefonoSchema = trimmed().regex(
  /^\+?\d{9,15}$/,
  "Telefono invalido (9-15 digitos, opcional +)",
);

const cpSchema = trimmed().regex(/^\d{5}$/, "Codigo postal invalido (5 digitos)");

const fechaNacimientoSchema = trimmed()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const min = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
    const max = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    return d >= min && d <= max;
  }, "Debes ser mayor de edad y la fecha debe ser plausible");

const provinciaSchema = trimmed().refine(
  (v) => PROVINCIAS_LIST.includes(v),
  "Provincia no reconocida",
);

// ---------------------------------------------------------------------
// Schema base.
// ---------------------------------------------------------------------
export const baseProfileSchema = z.object({
  nombre: trimmed().min(2, "Minimo 2").max(80, "Maximo 80"),
  apellidos: trimmed().min(2, "Minimo 2").max(120, "Maximo 120"),
  dni: dniNieSchema,
  telefono: telefonoSchema,
  fechaNacimiento: fechaNacimientoSchema,

  calle: trimmed().min(2).max(120),
  numero: trimmed().min(1).max(10),
  piso: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  codigoPostal: cpSchema,
  ciudad: trimmed().min(2).max(80),
  provincia: provinciaSchema,
  pais: trimmed().length(2).default("ES"),

  estadoCivil: z.preprocess(emptyToUndefined, z.enum(ESTADOS_CIVILES).optional()),
  profesion: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  situacionLaboral: z.preprocess(emptyToUndefined, z.enum(SITUACIONES_LABORALES).optional()),

  nss: z.preprocess(emptyToUndefined, nssSchema.optional()),
  iban: z.preprocess(emptyToUndefined, ibanSchema.optional()),

  tipoCliente: z.enum(TIPOS_CLIENTE).default("PARTICULAR"),

  cif: z.preprocess(emptyToUndefined, cifSchema.optional()),
  razonSocial: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  formaJuridica: z.preprocess(emptyToUndefined, z.enum(FORMAS_JURIDICAS).optional()),
  domicilioFiscal: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
});

export const profileSchema = baseProfileSchema.superRefine((data, ctx) => {
  if (data.tipoCliente !== "SOCIEDAD") return;
  if (!data.cif) {
    ctx.addIssue({ code: "custom", path: ["cif"], message: "Obligatorio para sociedad" });
  }
  if (!data.razonSocial) {
    ctx.addIssue({
      code: "custom",
      path: ["razonSocial"],
      message: "Obligatorio para sociedad",
    });
  }
  if (!data.formaJuridica) {
    ctx.addIssue({
      code: "custom",
      path: ["formaJuridica"],
      message: "Obligatorio para sociedad",
    });
  }
  if (!data.domicilioFiscal) {
    ctx.addIssue({
      code: "custom",
      path: ["domicilioFiscal"],
      message: "Obligatorio para sociedad",
    });
  }
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const profileUpdateSchema = baseProfileSchema.omit({ dni: true, iban: true });
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const sensitiveChangeRequestSchema = z.object({
  tipo: z.enum(["DNI", "IBAN"]),
  valor: z.string().min(1),
});
