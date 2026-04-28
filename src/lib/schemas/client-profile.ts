/**
 * Schemas Zod del perfil de cliente. Compartidos entre cliente y servidor.
 *
 * Política de obligatoriedad: solo nombre, DNI y teléfono son obligatorios.
 * El resto de campos son opcionales — si vienen vacíos se guardan como "".
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

// Helper para campos de texto opcionales: trim + "" → undefined, max length opcional.
const optionalText = (max?: number) =>
  z.preprocess(
    emptyToUndefined,
    max ? z.string().trim().max(max).optional() : z.string().trim().optional(),
  );

// Identificadores españoles.
const dniNieSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => {
    const r = detectAndValidate(v);
    return r.valid && (r.kind === "DNI" || r.kind === "NIE");
  }, "DNI/NIE inválido (revisa la letra de control)");

const cifSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => {
    const r = detectAndValidate(v);
    return r.valid && r.kind === "CIF";
  }, "CIF inválido (revisa la letra/dígito de control)");

const ibanSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine(isValidIBAN_ES, "IBAN español inválido");

const nssSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s/-]/g, ""))
  .pipe(z.string().regex(/^\d{12}$/, "Número de Seguridad Social inválido (12 dígitos)"));

const telefonoSchema = trimmed().regex(
  /^\+?\d{9,15}$/,
  "Teléfono inválido (9-15 dígitos, opcional +)",
);

const cpSchemaOpt = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Código postal inválido (5 dígitos)")
    .optional(),
);

const fechaNacimientoSchemaOpt = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      const min = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      const max = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d >= min && d <= max;
    }, "Fecha no válida")
    .optional(),
);

const provinciaSchemaOpt = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .refine((v) => PROVINCIAS_LIST.includes(v), "Provincia no reconocida")
    .optional(),
);

// ---------------------------------------------------------------------
// Schema base. Solo nombre, dni y teléfono son obligatorios.
// ---------------------------------------------------------------------
export const baseProfileSchema = z.object({
  nombre: trimmed().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80"),
  apellidos: optionalText(120),
  dni: dniNieSchema,
  telefono: telefonoSchema,
  fechaNacimiento: fechaNacimientoSchemaOpt,

  calle: optionalText(120),
  numero: optionalText(10),
  piso: optionalText(20),
  codigoPostal: cpSchemaOpt,
  ciudad: optionalText(80),
  provincia: provinciaSchemaOpt,
  pais: trimmed().length(2).default("ES"),

  estadoCivil: z.preprocess(emptyToUndefined, z.enum(ESTADOS_CIVILES).optional()),
  profesion: optionalText(120),
  situacionLaboral: z.preprocess(emptyToUndefined, z.enum(SITUACIONES_LABORALES).optional()),

  nss: z.preprocess(emptyToUndefined, nssSchema.optional()),
  iban: z.preprocess(emptyToUndefined, ibanSchema.optional()),

  tipoCliente: z.enum(TIPOS_CLIENTE).default("PARTICULAR"),

  cif: z.preprocess(emptyToUndefined, cifSchema.optional()),
  razonSocial: optionalText(200),
  formaJuridica: z.preprocess(emptyToUndefined, z.enum(FORMAS_JURIDICAS).optional()),
  domicilioFiscal: optionalText(200),
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
