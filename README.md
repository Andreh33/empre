# Asesoría Empresarial Juan García S.L. — Plataforma SaaS

Plataforma web profesional, segura y mobile-first para gestionar clientes, intercambiar documentos cifrados y comunicarse de forma directa con la asesoría. Construida para cumplir RGPD, LOPDGDD y LSSI-CE.

> **Estado actual:** Fase 1 (cimientos). Aún no incluye autenticación, gestión documental ni chat — esos módulos llegan en fases sucesivas.

---

## 🧱 Stack

| Capa            | Tecnología                                                        |
| --------------- | ----------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router) + TypeScript estricto                     |
| UI              | Tailwind CSS + shadcn/ui (Radix primitives)                       |
| BBDD            | Turso (libSQL) — región AWS EU-West-1 (Irlanda)                   |
| ORM             | Drizzle ORM con migraciones versionadas                           |
| Auth            | Auth.js (NextAuth v5) + Argon2id + 2FA TOTP _(Fase 2)_            |
| Almacenamiento  | Vercel Blob (UE) _(Fase 4)_                                       |
| Email           | Resend _(Fase 2)_                                                 |
| Rate limiting   | Upstash Redis _(Fase 2)_                                          |
| Antivirus       | VirusTotal API _(Fase 4)_                                         |
| CAPTCHA         | Cloudflare Turnstile _(Fase 2)_                                   |
| Validación      | Zod en cliente y servidor                                         |
| Cifrado         | AES-256-GCM (`@noble/ciphers`) + HMAC-SHA256 para búsqueda        |
| Despliegue      | Vercel — región `fra1` (Frankfurt) o `dub1` (Dublín)              |

---

## 📁 Estructura del proyecto

```
.
├── src/
│   ├── app/                      # Rutas App Router (UI)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/ui/            # shadcn/ui primitives
│   ├── db/
│   │   ├── schema.ts             # Esquema Drizzle (tablas, índices, tipos)
│   │   ├── index.ts              # Cliente Drizzle (singleton Turso)
│   │   └── migrate.ts            # Aplica migraciones generadas
│   ├── lib/
│   │   ├── env.ts                # Validación Zod de variables de entorno
│   │   ├── crypto.ts             # AES-256-GCM + HMAC para búsqueda
│   │   ├── spanish-id.ts         # Validación oficial DNI/NIE/CIF + IBAN
│   │   └── utils.ts              # cn() para Tailwind
│   ├── services/                 # (Fase 2+) capa de servicios de negocio
│   └── actions/                  # (Fase 2+) Server Actions de Next.js
├── drizzle/                      # Migraciones SQL generadas (gitignored)
├── next.config.ts                # Headers de seguridad (CSP, HSTS, etc.)
├── tailwind.config.ts            # Tokens de marca (#0F2A47 / #C9A961)
├── drizzle.config.ts
├── tsconfig.json                 # TS estricto + noUncheckedIndexedAccess
├── .env.example                  # Variables de entorno necesarias
├── .gitignore
└── README.md
```

---

## 🔐 Modelo de seguridad (resumen)

- **TLS 1.3** forzado en producción (HSTS preload).
- **CSP estricta** declarada en `next.config.ts`. `frame-ancestors: 'none'`, `object-src: 'none'`, `upgrade-insecure-requests`.
- **Cifrado de campos sensibles** (DNI/NIE, IBAN, NSS, CIF, secretos 2FA) con AES-256-GCM antes de persistir.
- **Búsqueda de DNI/email** mediante hash HMAC-SHA256 determinístico (no cifrado determinístico → resiste análisis de frecuencia).
- **Argon2id** para contraseñas (Fase 2). Política mín. 12 caracteres con mayúsculas, minúsculas, números y símbolos.
- **2FA TOTP** obligatorio para administradores; opcional pero recomendado para clientes.
- **Bloqueo progresivo:** 3 intentos → CAPTCHA, 5 → 15 min, 10 → 24 h + alerta por email.
- **Sesiones JWT:** 15 min de inactividad / 8 h máximo absoluto. Cookies `httpOnly, secure, sameSite=strict`.
- **Rate limiting:** 100 req/min por IP, 10 req/min en endpoints de auth.
- **Antivirus** + bloqueo por extensión Y magic number antes de subir a Blob.
- **Auditoría inmutable** en tabla `audit_logs` con retención 12 meses.
- **Backups diarios cifrados** con redundancia en otro proveedor UE _(Fase 9)_.

---

## 🚀 Puesta en marcha local

### 1. Requisitos

- Node.js ≥ 20 (probado con 24)
- npm ≥ 10
- Cuenta de Turso con base de datos creada en `aws-eu-west-1`

### 2. Instalar dependencias

```bash
npm install
```

> En Windows, `argon2` requiere Visual Studio Build Tools o `windows-build-tools`. Si la instalación falla, instala los Build Tools desde Visual Studio Installer (workload "Desarrollo para escritorio con C++") y vuelve a ejecutar `npm install`.

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

```bash
cp .env.example .env.local
```

Genera los secretos críticos:

```bash
# ENCRYPTION_KEY (32 bytes base64)
openssl rand -base64 32

# SEARCH_HMAC_KEY (32 bytes base64)
openssl rand -base64 32

# NEXTAUTH_SECRET (32 bytes base64)
openssl rand -base64 32
```

Mínimo imprescindible para arrancar en local:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `ENCRYPTION_KEY`
- `SEARCH_HMAC_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000`
- `APP_URL=http://localhost:3000`

### 4. Generar y aplicar migraciones a Turso

```bash
npm run db:generate   # genera SQL en ./drizzle desde src/db/schema.ts
npm run db:migrate    # aplica el SQL contra Turso
```

### 5. Arrancar

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000).

---

## ☁️ Despliegue en Vercel

### 1. Conectar el repositorio

1. Entra en [vercel.com/new](https://vercel.com/new).
2. Importa `https://github.com/Andreh33/empre.git`.
3. **Framework Preset:** Next.js (autodetectado).
4. **Root Directory:** `./` (raíz del repo).
5. **Build Command:** `npm run build` (por defecto).
6. **Install Command:** `npm install`.

### 2. Configurar la región (compute)

En **Project → Settings → Functions → Region**, selecciona:

- `fra1` (Frankfurt) — recomendado, latencia mínima desde España.
- alternativa: `dub1` (Dublín) — más cerca de Turso.

### 3. Variables de entorno en Vercel

En **Project → Settings → Environment Variables**, añade **todas** las variables del `.env.example` para los tres entornos (Production, Preview, Development). Marca como _Sensitive_ las claves criptográficas (`ENCRYPTION_KEY`, `SEARCH_HMAC_KEY`, `NEXTAUTH_SECRET`, `TURSO_AUTH_TOKEN`, etc.).

> ⚠️ Si rotas `ENCRYPTION_KEY` después de tener datos cifrados, los datos se vuelven irrecuperables hasta que implementes versión de clave + re-cifrado. **No la toques sin un plan de rotación**.

### 4. Despliegue automático

Cada push a `main` lanza un build de producción. Cada PR genera una preview URL.

---

## 📦 Comandos útiles

```bash
npm run dev           # arranca Next.js en modo desarrollo
npm run build         # build de producción
npm run start         # sirve el build (post-build)
npm run lint          # ESLint
npm run typecheck     # TS sin emit
npm run format        # Prettier (auto-fix)
npm run format:check  # Prettier (check)
npm run db:generate   # genera migraciones desde schema.ts
npm run db:migrate    # aplica migraciones a Turso
npm run db:studio     # abre Drizzle Studio (UI BBDD)
```

---

## 🗺️ Roadmap

- [x] **Fase 1 — Cimientos** (este commit): Next.js + TS + Tailwind + shadcn/ui, Turso + Drizzle, esquema BD, headers de seguridad, libs de cifrado y validación de DNI/NIE/CIF, README.
- [ ] **Fase 2 — Auth y roles:** registro con verificación email, login con bloqueo + Turnstile, 2FA TOTP, recuperación, middleware de protección por rol.
- [ ] **Fase 3 — Datos del cliente:** formularios completos con Zod, cifrado de campos sensibles, registro de consentimientos.
- [ ] **Fase 4 — Gestión documental:** carpetas, subida cifrada con antivirus, categorización, estados, previsualización, mensajes adjuntos.
- [ ] **Fase 5 — Chat y notificaciones:** mensajería bidireccional, push (Web Push) + email, plantillas.
- [ ] **Fase 6 — Calendario fiscal y notas internas.**
- [ ] **Fase 7 — RGPD y auditoría:** logs, exportación Art. 15, baja Art. 17, banner de cookies granular.
- [ ] **Fase 8 — PWA y pulido:** service worker, manifest, offline, Lighthouse > 90, Vitest + Playwright.
- [ ] **Fase 9 — Despliegue final:** GitHub Actions, dominio, Sentry, backups documentados.

---

## ⚖️ Cumplimiento legal

Las plantillas de privacidad, aviso legal, cookies y términos llegan en la **Fase 7** y deben ser revisadas por un abogado especializado antes de salir a producción.

---

## 🤝 Primer push al repositorio

Desde la raíz del proyecto:

```bash
git init
git add .
git commit -m "Fase 1: cimientos del proyecto (Next.js, Turso, Drizzle, seguridad base)"
git branch -M main
git remote add origin https://github.com/Andreh33/empre.git
git push -u origin main
```

Si el remoto ya existe (`fatal: remote origin already exists`), usa `git remote set-url origin https://github.com/Andreh33/empre.git`.

---

_Construido por encargo de Juan García. Pendiente de auditoría legal y de seguridad antes de producción._
