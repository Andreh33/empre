# Asesoría Empresarial Juan García S.L. — Plataforma SaaS

Plataforma web profesional, segura y mobile-first para que la asesoría gestione clientes, intercambie documentos cifrados y mantenga conversación con ellos. Construida para cumplir RGPD, LOPDGDD y LSSI-CE.

> Estado actual: Fases 1 a 9 implementadas. Pendiente de auditoría legal y de seguridad antes de exposición pública.

---

## 🧱 Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript estricto |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| BBDD | Turso (libSQL) — región AWS EU-West-1 (Irlanda) |
| ORM | Drizzle ORM con migraciones versionadas |
| Auth | Auth.js v5 + Argon2id + 2FA TOTP |
| Almacenamiento | Vercel Blob (UE) |
| Email | Resend |
| Rate limiting | Upstash Redis |
| Antivirus | VirusTotal API + magic-number |
| CAPTCHA | Cloudflare Turnstile |
| Validación | Zod cliente y servidor |
| Cifrado | AES-256-GCM (`@noble/ciphers`) + HMAC-SHA256 búsqueda |
| Tests | Vitest |
| CI/CD | GitHub Actions + Vercel |

---

## 📁 Estructura

```
src/
├── app/                    # App Router (UI)
│   ├── (auth)/             # login, registro, recuperar, verificar
│   ├── admin/              # panel administrativo
│   ├── panel/              # área cliente
│   ├── legal/              # privacidad, aviso legal, cookies, términos
│   └── api/                # auth, files, rgpd...
├── auth/                   # Auth.js config (server + edge)
├── actions/                # Server Actions (auth, profile, files, ...)
├── components/             # UI: ui/, auth/, files/, chat/, calendar/, legal/, pwa/...
├── db/schema.ts            # Esquema Drizzle (12 tablas)
├── lib/                    # env, crypto, schemas, guards, utils
├── services/               # password, mail, rate-limit, storage, antivirus, files, ...
└── types/                  # next-auth.d.ts
public/
├── manifest.webmanifest
├── icons/icon-192.svg, icon-512.svg
└── sw.js                   # service worker
scripts/seed-superadmin.ts
tests/                      # Vitest
.github/workflows/ci.yml
```

---

## 🔐 Modelo de seguridad

- **TLS 1.3** forzado (HSTS preload).
- **CSP** estricta declarada en `next.config.ts` (`frame-ancestors: 'none'`, `object-src: 'none'`, `upgrade-insecure-requests`).
- **Cifrado de campos sensibles** (DNI/NIE, IBAN, NSS, CIF, secretos 2FA): AES-256-GCM antes de persistir.
- **Cifrado de archivos**: cada blob se cifra en servidor antes de subir a Vercel Blob; contenido público sólo opaco. Las descargas se hacen vía `/api/files/[id]` (descifra y entrega).
- **Búsqueda por DNI/email**: hash HMAC-SHA256 determinístico (resiste análisis de frecuencia).
- **Argon2id** (OWASP 2023): mín. 12 caracteres con mayús, minús, números y símbolos.
- **2FA TOTP** obligatorio para administradores (excepción de bootstrap para SUPER_ADMIN inicial); opcional pero recomendado para clientes.
- **Bloqueo progresivo**: 3 fallos → CAPTCHA, 5 → 15 min, 10 → 24 h + email de alerta.
- **Sesiones JWT**: 15 min inactividad / 8 h máximo absoluto. Cookies `httpOnly + secure + sameSite=strict`, `__Secure-` en prod.
- **Rate limiting** (Upstash sliding-window): 10 req/min auth, 100 req/min global.
- **Antivirus** (VirusTotal): rechaza `INFECTED`. Bloqueo previo por extensión y magic-number.
- **Auditoría inmutable** en `audit_logs` con retención 12 meses.
- **Cabeceras**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP.

---

## 🧩 Funcionalidades

### Cliente (`/panel`)
- Onboarding obligatorio si no hay perfil.
- Mis datos: ver y editar (DNI/IBAN con confirmación email 30 min).
- Documentos: subida drag&drop (cámara móvil), 50 MB máx, antivirus, cifrado, ZIP múltiple, vista de archivos del admin con tu mensaje.
- Mensajes: chat con la asesoría (notifica al admin asignado por email).
- Calendario fiscal: eventos genéricos + personalizados.
- Privacidad: descarga RGPD Art. 15 (ZIP datos+documentos), solicitar baja Art. 17.
- Seguridad: activar/desactivar 2FA, recuperar contraseña.

### Administrador (`/admin`)
- Listado de clientes paginado con buscador (nombre, apellidos, email, teléfono y **DNI exacto** vía hash).
- Ficha completa con edición sin necesidad de confirmación email.
- Documentos por cliente: sube con mensaje (genera mensaje en chat), separa archivos del admin y archivos enviados por el cliente.
- Chat con plantillas frecuentes.
- Calendario por cliente (general en `/admin/calendario`, evento por cliente en su pestaña).
- Notas internas privadas.
- Auditoría con filtros por acción/fecha/usuario.
- Calendario: SUPER_ADMIN puede sembrar eventos fiscales genéricos del año.

---

## 🚀 Puesta en marcha local

### 1. Requisitos
- Node ≥ 20 (probado con 24)
- npm ≥ 10
- Cuenta Turso con base de datos en `aws-eu-west-1`.

### 2. Instalar y configurar
```bash
npm install
cp .env.example .env.local

# Genera secretos
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # SEARCH_HMAC_KEY
openssl rand -base64 32   # NEXTAUTH_SECRET
```
Mínimo para arrancar: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ENCRYPTION_KEY`, `SEARCH_HMAC_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`, `APP_URL=http://localhost:3000`.

> En Windows, `argon2` requiere Visual Studio Build Tools (workload "Desarrollo para escritorio con C++").

### 3. BBDD y seed
```bash
npm run db:generate
npm run db:migrate
npm run seed:superadmin -- "<email>" "<password>"
```

### 4. Arrancar
```bash
npm run dev
```

### 5. Tests
```bash
npm run test            # Vitest
npm run typecheck       # TS estricto
npm run build           # Next build (también en CI)
```

---

## ☁️ Despliegue en Vercel

1. **Importa el repo**: <https://github.com/Andreh33/empre.git>.
2. **Framework Preset**: Next.js (autodetectado).
3. **Compute Region**: `fra1` (Frankfurt) o `dub1` (Dublín).
4. **Variables de entorno** (Production y Preview): copia las del `.env.example`. Marca como _Sensitive_ las claves criptográficas.
5. **Vercel Blob**: Project → Storage → Connect Blob (UE).
6. **Cada push a `main` redeploy automático**. Cada PR genera una preview URL.

> ⚠️ Si rotas `ENCRYPTION_KEY` después de tener datos cifrados, no podrán descifrarse. Cualquier rotación requiere un script de re-cifrado previo.

---

## 🤖 CI/CD

`.github/workflows/ci.yml` corre lint + typecheck + tests + build en cada push y PR a `main` con secretos dummy. Vercel se encarga del deploy real.

---

## 📊 Monitorización (recomendado en producción)

- **Vercel Analytics**: activar desde el dashboard.
- **Sentry** (opcional): añade `SENTRY_DSN` y wrappea con `@sentry/nextjs` (out of scope; se conecta por SDK install).
- **Uptime**: Better Uptime, UptimeRobot o Pingdom — apuntando a `/login` y a un endpoint `/api/health` (a crear si lo necesitas).

---

## 🧷 Backups y restauración

1. **Turso**: ya hace replicación geográfica. Para snapshot: `turso db shell asesoria-andreh ".dump" > backup-$(date +%F).sql` desde un cron.
2. **Vercel Blob**: copia incremental nocturna a S3 EU mediante Action que liste `/api/files` y guarde el blob cifrado tal cual (es ya AES-GCM, no se necesita re-cifrar).
3. **Test mensual**: restaurar Turso a una base alternativa y verificar que un archivo se descarga e incluye su SHA-256 original.

---

## ⚖️ Cumplimiento legal

Plantillas iniciales en `/legal/privacidad`, `/legal/aviso-legal`, `/legal/cookies`, `/legal/terminos`. **Deben ser revisadas por abogado especializado** antes de producción. Faltan campos para cumplimentar: NIF, dirección, registro mercantil, email/teléfono.

---

## 🗺️ Roadmap completado

- [x] **Fase 1 — Cimientos**
- [x] **Fase 2 — Auth y roles** (Argon2id, 2FA, lockout, recuperación)
- [x] **Fase 3 — Datos del cliente** (DNI/NIE/CIF/IBAN cifrados, sociedad)
- [x] **Fase 4 — Gestión documental** (cifrado por archivo, antivirus, ZIP)
- [x] **Fase 5 — Chat y notificaciones** (admin↔cliente, email Resend, plantillas)
- [x] **Fase 6 — Calendario fiscal** (genéricos AEAT precargados + personalizados, notas internas)
- [x] **Fase 7 — RGPD** (export Art.15, baja Art.17, banner cookies granular, páginas legales)
- [x] **Fase 8 — PWA y tests** (manifest, service worker, iconos, Vitest)
- [x] **Fase 9 — CI/CD** (GitHub Actions con lint+typecheck+test+build)

### Cosas pendientes para producción real

- Rellenar NIF, dirección y datos registrales en plantillas legales.
- Conectar `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `TURNSTILE_*`, `UPSTASH_*`, `VIRUSTOTAL_API_KEY` en Vercel.
- Configurar dominio propio y certificado.
- Sentry SDK (`npx @sentry/wizard@latest -i nextjs`) si se desea telemetría.
- Cron diario de borrado físico de cuentas con `deletionScheduledFor < now()`.
- Cron diario de envío de recordatorios fiscales (`fiscalEvents` con `recordatorioDiasAntes`).
- Auditoría de seguridad por terceros (pentest).

---

_Construido por encargo de Juan García. Revisión legal y de seguridad pendiente._
