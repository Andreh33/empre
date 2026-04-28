/**
 * Esquema de la base de datos (Turso / libSQL via Drizzle).
 *
 * Convenciones:
 * - IDs: UUID v4 generados en aplicacion.
 * - Timestamps: ISO 8601 en TEXT (libSQL no tiene TIMESTAMP nativo).
 * - Campos sensibles (DNI, IBAN, NSS, CIF): cifrados con AES-256-GCM
 *   antes de persistir (ver src/lib/crypto.ts). Se almacenan en columnas
 *   *_encrypted (texto base64). Para busqueda se mantiene un hash HMAC
 *   determinista en columnas *_hash.
 * - Borrado logico: deleted_at. El borrado fisico se realiza tras el
 *   periodo de gracia de 7 dias (ver Fase 7).
 */
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------
// Roles y enumeraciones
// ---------------------------------------------------------------------
export const ROLES = ["SUPER_ADMIN", "ADMIN", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const TIPOS_CLIENTE = ["PARTICULAR", "AUTONOMO", "SOCIEDAD"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const SITUACIONES_LABORALES = [
  "AUTONOMO",
  "ASALARIADO",
  "EMPRESA",
  "DESEMPLEADO",
  "JUBILADO",
  "ESTUDIANTE",
] as const;

export const FORMAS_JURIDICAS = ["SL", "SA", "SLU", "COOPERATIVA", "CB", "OTRA"] as const;

export const ESTADOS_CIVILES = [
  "SOLTERO",
  "CASADO",
  "DIVORCIADO",
  "VIUDO",
  "PAREJA_DE_HECHO",
] as const;

export const CATEGORIAS_DOC = [
  "RENTA",
  "IVA",
  "SOCIEDADES",
  "NOMINAS",
  "MODELO_303",
  "MODELO_130",
  "MODELO_100",
  "MODELO_200",
  "OTROS",
] as const;

export const ESTADOS_DOC = ["PENDIENTE", "EN_PROCESO", "REVISADO", "ENTREGADO"] as const;

export const TIPOS_CONSENTIMIENTO = [
  "PRIVACIDAD",
  "TERMINOS",
  "COOKIES_ANALITICAS",
  "COOKIES_MARKETING",
  "COMUNICACIONES_COMERCIALES",
] as const;

export const ACCIONES_AUDIT = [
  "LOGIN_OK",
  "LOGIN_FAIL",
  "LOGIN_LOCKED",
  "LOGOUT",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET_OK",
  "EMAIL_VERIFIED",
  "TWO_FA_ENABLED",
  "TWO_FA_DISABLED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_SOFT_DELETED",
  "USER_HARD_DELETED",
  "ROLE_CHANGED",
  "PROFILE_CREATED",
  "PROFILE_UPDATED",
  "PROFILE_SENSITIVE_CHANGE_REQUESTED",
  "PROFILE_SENSITIVE_CHANGE_CONFIRMED",
  "ASSIGNED_ADMIN_CHANGED",
  "FILE_UPLOADED",
  "FILE_DOWNLOADED",
  "FILE_DELETED",
  "FOLDER_CREATED",
  "FOLDER_DELETED",
  "MESSAGE_SENT",
  "DATA_EXPORTED",
  "CONSENT_GIVEN",
  "CONSENT_REVOKED",
] as const;

export const TIPOS_CAMBIO_SENSIBLE = ["DNI", "IBAN"] as const;

// ---------------------------------------------------------------------
// users: cuenta de acceso (admins y clientes).
// ---------------------------------------------------------------------
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailHash: text("email_hash").notNull(), // HMAC-SHA256 para busqueda case-insensitive
    passwordHash: text("password_hash").notNull(), // Argon2id
    role: text("role", { enum: ROLES }).notNull().default("CLIENT"),
    twoFactorSecret: text("two_factor_secret"), // cifrado AES-GCM
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    emailVerifiedAt: text("email_verified_at"),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: text("locked_until"),
    lastLoginAt: text("last_login_at"),
    lastLoginIp: text("last_login_ip"),
    onboardingCompleted: integer("onboarding_completed", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
    deletionScheduledFor: text("deletion_scheduled_for"),
  },
  (t) => ({
    emailHashIdx: uniqueIndex("users_email_hash_idx").on(t.emailHash),
    roleIdx: index("users_role_idx").on(t.role),
    deletedAtIdx: index("users_deleted_at_idx").on(t.deletedAt),
  }),
);

// ---------------------------------------------------------------------
// email_verification_tokens
// password_reset_tokens
// ---------------------------------------------------------------------
export const emailVerificationTokens = sqliteTable(
  "email_verification_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("email_verif_token_hash_idx").on(t.tokenHash),
    userIdIdx: index("email_verif_user_idx").on(t.userId),
  }),
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("pwd_reset_token_hash_idx").on(t.tokenHash),
    userIdIdx: index("pwd_reset_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------
// sensitive_change_tokens: confirmacion email para cambios de DNI/IBAN.
// El "payload" guarda el nuevo valor cifrado, hasta que el usuario confirma.
// ---------------------------------------------------------------------
export const sensitiveChangeTokens = sqliteTable(
  "sensitive_change_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: TIPOS_CAMBIO_SENSIBLE }).notNull(),
    payloadEncrypted: text("payload_encrypted").notNull(), // valor nuevo cifrado
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("sensitive_change_token_hash_idx").on(t.tokenHash),
    userIdIdx: index("sensitive_change_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------
// sessions: gestionado por Auth.js, pero definimos la tabla.
// ---------------------------------------------------------------------
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastActivityAt: text("last_activity_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    sessionTokenIdx: uniqueIndex("sessions_token_idx").on(t.sessionToken),
    userIdIdx: index("sessions_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------
// client_profiles: 1:1 con users cuando role = CLIENT.
// Campos sensibles cifrados (sufijo _encrypted) + hashes HMAC para busqueda.
// ---------------------------------------------------------------------
export const clientProfiles = sqliteTable(
  "client_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identidad basica (no cifrada por usabilidad operativa).
    nombre: text("nombre").notNull(),
    apellidos: text("apellidos").notNull(),
    telefono: text("telefono").notNull(),
    fechaNacimiento: text("fecha_nacimiento").notNull(), // ISO YYYY-MM-DD

    // DNI/NIE: cifrado simetrico + hash determinista para busqueda.
    dniEncrypted: text("dni_encrypted").notNull(),
    dniHash: text("dni_hash").notNull(),

    // Direccion completa.
    calle: text("calle").notNull(),
    numero: text("numero").notNull(),
    piso: text("piso"),
    codigoPostal: text("codigo_postal").notNull(),
    ciudad: text("ciudad").notNull(),
    provincia: text("provincia").notNull(),
    pais: text("pais").notNull().default("ES"),

    // Datos opcionales.
    estadoCivil: text("estado_civil", { enum: ESTADOS_CIVILES }),
    profesion: text("profesion"),
    situacionLaboral: text("situacion_laboral", { enum: SITUACIONES_LABORALES }),

    // Datos cifrados opcionales.
    nssEncrypted: text("nss_encrypted"),
    ibanEncrypted: text("iban_encrypted"),

    // Tipo de cliente.
    tipoCliente: text("tipo_cliente", { enum: TIPOS_CLIENTE })
      .notNull()
      .default("PARTICULAR"),

    // Datos de sociedad (solo si tipoCliente = SOCIEDAD).
    cifEncrypted: text("cif_encrypted"),
    cifHash: text("cif_hash"),
    razonSocial: text("razon_social"),
    formaJuridica: text("forma_juridica", { enum: FORMAS_JURIDICAS }),
    domicilioFiscal: text("domicilio_fiscal"),

    // Asignacion al admin gestor (puede cambiar).
    assignedAdminId: text("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    userIdIdx: uniqueIndex("client_profiles_user_idx").on(t.userId),
    dniHashIdx: uniqueIndex("client_profiles_dni_hash_idx").on(t.dniHash),
    cifHashIdx: index("client_profiles_cif_hash_idx").on(t.cifHash),
    tipoIdx: index("client_profiles_tipo_idx").on(t.tipoCliente),
    apellidosIdx: index("client_profiles_apellidos_idx").on(t.apellidos),
    assignedAdminIdx: index("client_profiles_admin_idx").on(t.assignedAdminId),
  }),
);

// ---------------------------------------------------------------------
// folders: estructura jerarquica por cliente.
// ---------------------------------------------------------------------
export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    clientUserId: text("client_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    nombre: text("nombre").notNull(),
    creadaPorUserId: text("creada_por_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    clientIdx: index("folders_client_idx").on(t.clientUserId),
    parentIdx: index("folders_parent_idx").on(t.parentId),
  }),
);

// ---------------------------------------------------------------------
// files: archivos cifrados en Vercel Blob.
// ---------------------------------------------------------------------
export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // cliente al que pertenece
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => users.id), // quien lo subio (admin o cliente)
    nombreOriginal: text("nombre_original").notNull(),
    nombreAlmacenamiento: text("nombre_almacenamiento").notNull(), // pathname en Blob
    blobUrl: text("blob_url").notNull(),
    mimeType: text("mime_type").notNull(),
    tamanoBytes: integer("tamano_bytes").notNull(),
    sha256: text("sha256").notNull(),
    categoria: text("categoria", { enum: CATEGORIAS_DOC }).notNull().default("OTROS"),
    estado: text("estado", { enum: ESTADOS_DOC }).notNull().default("PENDIENTE"),
    antivirusStatus: text("antivirus_status", { enum: ["PENDING", "CLEAN", "INFECTED", "ERROR"] })
      .notNull()
      .default("PENDING"),
    antivirusReport: text("antivirus_report"), // JSON con resultado
    mensajeAdjunto: text("mensaje_adjunto"), // mensaje opcional al subir
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    ownerIdx: index("files_owner_idx").on(t.ownerId),
    folderIdx: index("files_folder_idx").on(t.folderId),
    categoriaIdx: index("files_categoria_idx").on(t.categoria),
    estadoIdx: index("files_estado_idx").on(t.estado),
    createdAtIdx: index("files_created_at_idx").on(t.createdAt),
    sha256Idx: index("files_sha256_idx").on(t.sha256),
  }),
);

// ---------------------------------------------------------------------
// messages: chat bidireccional admin <-> cliente.
// ---------------------------------------------------------------------
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toClientUserId: text("to_client_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contenido: text("contenido").notNull(),
    archivosAdjuntos: text("archivos_adjuntos"), // JSON: array de file IDs
    leido: integer("leido", { mode: "boolean" }).notNull().default(false),
    leidoAt: text("leido_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    clientIdx: index("messages_client_idx").on(t.toClientUserId),
    fromIdx: index("messages_from_idx").on(t.fromUserId),
    leidoIdx: index("messages_leido_idx").on(t.leido),
    createdAtIdx: index("messages_created_at_idx").on(t.createdAt),
  }),
);

// ---------------------------------------------------------------------
// internal_notes: notas privadas del admin sobre un cliente.
// NUNCA se exponen a clientes.
// ---------------------------------------------------------------------
export const internalNotes = sqliteTable(
  "internal_notes",
  {
    id: text("id").primaryKey(),
    clientUserId: text("client_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id),
    contenido: text("contenido").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    clientIdx: index("internal_notes_client_idx").on(t.clientUserId),
    authorIdx: index("internal_notes_author_idx").on(t.authorUserId),
  }),
);

// ---------------------------------------------------------------------
// fiscal_calendar: eventos genericos + personalizados por cliente.
// ---------------------------------------------------------------------
export const fiscalEvents = sqliteTable(
  "fiscal_events",
  {
    id: text("id").primaryKey(),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    fecha: text("fecha").notNull(), // ISO YYYY-MM-DD
    esGenerico: integer("es_generico", { mode: "boolean" }).notNull().default(true),
    clientUserId: text("client_user_id").references(() => users.id, { onDelete: "cascade" }),
    recordatorioDiasAntes: integer("recordatorio_dias_antes").notNull().default(7),
    notificadoEn: text("notificado_en"),
    creadoPorUserId: text("creado_por_user_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (t) => ({
    fechaIdx: index("fiscal_events_fecha_idx").on(t.fecha),
    clientIdx: index("fiscal_events_client_idx").on(t.clientUserId),
    genericoIdx: index("fiscal_events_generico_idx").on(t.esGenerico),
  }),
);

// ---------------------------------------------------------------------
// audit_logs: inmutables, retencion 12 meses (limpieza por cron).
// ---------------------------------------------------------------------
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    accion: text("accion", { enum: ACCIONES_AUDIT }).notNull(),
    recursoTipo: text("recurso_tipo"),
    recursoId: text("recurso_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: text("metadata"), // JSON
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    accionIdx: index("audit_accion_idx").on(t.accion),
    createdAtIdx: index("audit_created_at_idx").on(t.createdAt),
    recursoIdx: index("audit_recurso_idx").on(t.recursoTipo, t.recursoId),
  }),
);

// ---------------------------------------------------------------------
// consents: registro de consentimientos RGPD (versionado).
// ---------------------------------------------------------------------
export const consents = sqliteTable(
  "consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipoConsentimiento: text("tipo_consentimiento", { enum: TIPOS_CONSENTIMIENTO }).notNull(),
    versionDocumento: text("version_documento").notNull(),
    aceptado: integer("aceptado", { mode: "boolean" }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => ({
    userIdx: index("consents_user_idx").on(t.userId),
    tipoIdx: index("consents_tipo_idx").on(t.tipoConsentimiento),
  }),
);

// ---------------------------------------------------------------------
// Tipos inferidos.
// ---------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InternalNote = typeof internalNotes.$inferSelect;
export type FiscalEvent = typeof fiscalEvents.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type SensitiveChangeToken = typeof sensitiveChangeTokens.$inferSelect;
