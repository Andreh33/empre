/**
 * Servicio de perfil del cliente.
 *
 * Cifra DNI/IBAN/NSS/CIF antes de persistir y los descifra al leer.
 * Ademas mantiene hashes deterministas (HMAC-SHA256) en *_hash para
 * permitir busquedas por DNI/CIF sin recurrir a cifrado deterministico.
 */
import { randomUUID } from "node:crypto";
import { and, eq, isNull, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { encryptField, decryptField, searchHash } from "@/lib/crypto";
import type { ProfileInput, ProfileUpdateInput } from "@/lib/schemas/client-profile";

/**
 * Vista descifrada del perfil para uso en UI/admin (NUNCA exponer en logs).
 */
export interface DecryptedClientProfile {
  id: string;
  userId: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  fechaNacimiento: string;
  calle: string;
  numero: string;
  piso: string | null;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  estadoCivil: string | null;
  profesion: string | null;
  situacionLaboral: string | null;
  nss: string | null;
  iban: string | null;
  tipoCliente: "PARTICULAR" | "AUTONOMO" | "SOCIEDAD";
  cif: string | null;
  razonSocial: string | null;
  formaJuridica: string | null;
  domicilioFiscal: string | null;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

function decryptOpt(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  return decryptField(encrypted);
}

function rowToView(row: typeof schema.clientProfiles.$inferSelect): DecryptedClientProfile {
  return {
    id: row.id,
    userId: row.userId,
    nombre: row.nombre,
    apellidos: row.apellidos,
    dni: decryptField(row.dniEncrypted),
    telefono: row.telefono,
    fechaNacimiento: row.fechaNacimiento,
    calle: row.calle,
    numero: row.numero,
    piso: row.piso ?? null,
    codigoPostal: row.codigoPostal,
    ciudad: row.ciudad,
    provincia: row.provincia,
    pais: row.pais,
    estadoCivil: row.estadoCivil ?? null,
    profesion: row.profesion ?? null,
    situacionLaboral: row.situacionLaboral ?? null,
    nss: decryptOpt(row.nssEncrypted),
    iban: decryptOpt(row.ibanEncrypted),
    tipoCliente: row.tipoCliente,
    cif: decryptOpt(row.cifEncrypted),
    razonSocial: row.razonSocial ?? null,
    formaJuridica: row.formaJuridica ?? null,
    domicilioFiscal: row.domicilioFiscal ?? null,
    assignedAdminId: row.assignedAdminId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getProfileByUserId(
  userId: string,
): Promise<DecryptedClientProfile | null> {
  const [row] = await db
    .select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, userId))
    .limit(1);
  return row ? rowToView(row) : null;
}

/** Comprueba que un DNI no este ya asociado a OTRO usuario (alta o cambio). */
export async function isDniInUse(dni: string, exceptUserId?: string): Promise<boolean> {
  const hash = searchHash(dni);
  const [row] = await db
    .select({ userId: schema.clientProfiles.userId })
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.dniHash, hash))
    .limit(1);
  if (!row) return false;
  return row.userId !== exceptUserId;
}

export async function createProfile(userId: string, input: ProfileInput): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.clientProfiles).values({
    id,
    userId,
    nombre: input.nombre,
    apellidos: input.apellidos,
    telefono: input.telefono,
    fechaNacimiento: input.fechaNacimiento,
    dniEncrypted: encryptField(input.dni),
    dniHash: searchHash(input.dni),
    calle: input.calle,
    numero: input.numero,
    piso: input.piso ?? null,
    codigoPostal: input.codigoPostal,
    ciudad: input.ciudad,
    provincia: input.provincia,
    pais: input.pais,
    estadoCivil: input.estadoCivil ?? null,
    profesion: input.profesion ?? null,
    situacionLaboral: input.situacionLaboral ?? null,
    nssEncrypted: input.nss ? encryptField(input.nss) : null,
    ibanEncrypted: input.iban ? encryptField(input.iban) : null,
    tipoCliente: input.tipoCliente,
    cifEncrypted: input.cif ? encryptField(input.cif) : null,
    cifHash: input.cif ? searchHash(input.cif) : null,
    razonSocial: input.razonSocial ?? null,
    formaJuridica: input.formaJuridica ?? null,
    domicilioFiscal: input.domicilioFiscal ?? null,
  });
  await db
    .update(schema.users)
    .set({ onboardingCompleted: true, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, userId));
  return id;
}

/**
 * Actualiza datos NO sensibles. DNI e IBAN se cambian por flujo aparte
 * (ver applySensitiveChange).
 */
export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<void> {
  await db
    .update(schema.clientProfiles)
    .set({
      nombre: input.nombre,
      apellidos: input.apellidos,
      telefono: input.telefono,
      fechaNacimiento: input.fechaNacimiento,
      calle: input.calle,
      numero: input.numero,
      piso: input.piso ?? null,
      codigoPostal: input.codigoPostal,
      ciudad: input.ciudad,
      provincia: input.provincia,
      pais: input.pais,
      estadoCivil: input.estadoCivil ?? null,
      profesion: input.profesion ?? null,
      situacionLaboral: input.situacionLaboral ?? null,
      nssEncrypted: input.nss ? encryptField(input.nss) : null,
      tipoCliente: input.tipoCliente,
      cifEncrypted: input.cif ? encryptField(input.cif) : null,
      cifHash: input.cif ? searchHash(input.cif) : null,
      razonSocial: input.razonSocial ?? null,
      formaJuridica: input.formaJuridica ?? null,
      domicilioFiscal: input.domicilioFiscal ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.clientProfiles.userId, userId));
}

export async function applySensitiveChange(
  userId: string,
  tipo: "DNI" | "IBAN",
  newValue: string,
): Promise<void> {
  if (tipo === "DNI") {
    await db
      .update(schema.clientProfiles)
      .set({
        dniEncrypted: encryptField(newValue),
        dniHash: searchHash(newValue),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.clientProfiles.userId, userId));
  } else {
    await db
      .update(schema.clientProfiles)
      .set({
        ibanEncrypted: encryptField(newValue),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.clientProfiles.userId, userId));
  }
}

// ---------------------------------------------------------------------
// Listado / busqueda para admin.
// ---------------------------------------------------------------------
export interface ListClientsArgs {
  search?: string;
  tipoCliente?: "PARTICULAR" | "AUTONOMO" | "SOCIEDAD";
  situacionLaboral?: string;
  page?: number;
  pageSize?: number;
}

export interface ClientListItem {
  userId: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  tipoCliente: "PARTICULAR" | "AUTONOMO" | "SOCIEDAD";
  ciudad: string;
  createdAt: string;
}

export async function listClients(
  args: ListClientsArgs = {},
): Promise<{ items: ClientListItem[]; total: number }> {
  const search = args.search?.trim() ?? "";
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, args.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  // Si search parece un DNI valido, lo buscamos por hash exacto.
  let dniHash: string | null = null;
  if (search) {
    const cleaned = search.replace(/[\s-]/g, "").toUpperCase();
    if (/^[0-9XYZ][0-9]{7}[A-Z]$/.test(cleaned) || /^\d{8}[A-Z]$/.test(cleaned)) {
      dniHash = searchHash(cleaned);
    }
  }

  const baseConditions = [
    eq(schema.users.role, "CLIENT"),
    isNull(schema.users.deletedAt),
  ];

  if (args.tipoCliente) {
    baseConditions.push(eq(schema.clientProfiles.tipoCliente, args.tipoCliente));
  }

  let where = and(...baseConditions);
  if (search) {
    const searchOr = or(
      like(schema.clientProfiles.nombre, `%${search}%`),
      like(schema.clientProfiles.apellidos, `%${search}%`),
      like(schema.users.email, `%${search.toLowerCase()}%`),
      like(schema.clientProfiles.telefono, `%${search}%`),
      ...(dniHash ? [eq(schema.clientProfiles.dniHash, dniHash)] : []),
    );
    where = and(where, searchOr);
  }

  const rows = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      nombre: schema.clientProfiles.nombre,
      apellidos: schema.clientProfiles.apellidos,
      telefono: schema.clientProfiles.telefono,
      tipoCliente: schema.clientProfiles.tipoCliente,
      ciudad: schema.clientProfiles.ciudad,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .innerJoin(
      schema.clientProfiles,
      eq(schema.clientProfiles.userId, schema.users.id),
    )
    .where(where)
    .orderBy(schema.clientProfiles.apellidos)
    .limit(pageSize)
    .offset(offset);

  // Total mediante un select count separado.
  const totalRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(
      schema.clientProfiles,
      eq(schema.clientProfiles.userId, schema.users.id),
    )
    .where(where);

  return { items: rows, total: totalRows.length };
}
