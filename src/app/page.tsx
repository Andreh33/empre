import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-brand text-white">
        <div className="container flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-md bg-gold font-bold text-brand"
            >
              JG
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide">Asesoria Empresarial</p>
              <p className="text-xs text-white/70">Juan Garcia S.L.</p>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm md:flex">
            <Link href="/login" className="hover:text-gold">
              Acceder
            </Link>
            <Link href="/registro" className="hover:text-gold">
              Soy nuevo cliente
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 bg-gradient-to-b from-brand to-brand-700 text-white">
        <div className="container grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold">
              Plataforma segura
            </p>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              Tu asesoria, accesible y cifrada de extremo a extremo.
            </h1>
            <p className="text-lg text-white/80 md:text-xl">
              Sube documentos, habla con tu asesor y consulta vencimientos fiscales desde el movil.
              Cumplimos RGPD y LOPDGDD: tus datos estan cifrados en servidores de la Union Europea.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-gold px-5 py-3 font-semibold text-brand transition hover:bg-gold-400"
              >
                Acceder a mi cuenta
              </Link>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Quiero ser cliente
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:self-center">
            {[
              {
                t: "Documentos cifrados",
                d: "AES-256-GCM en reposo y TLS 1.3 en transito.",
              },
              {
                t: "2FA y bloqueo progresivo",
                d: "Doble factor TOTP y proteccion contra ataques.",
              },
              {
                t: "Cumplimiento RGPD",
                d: "Servidores en la UE, derechos ARCO automatizados.",
              },
              {
                t: "Movil primero",
                d: "Sube facturas con la camara, instalable como app.",
              },
            ].map((f) => (
              <li
                key={f.t}
                className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <p className="font-semibold text-gold">{f.t}</p>
                <p className="mt-1 text-sm text-white/80">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background py-8">
        <div className="container flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>(c) {new Date().getFullYear()} Asesoria Empresarial Juan Garcia S.L.</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/legal/privacidad" className="hover:underline">
              Privacidad
            </Link>
            <Link href="/legal/aviso-legal" className="hover:underline">
              Aviso legal
            </Link>
            <Link href="/legal/cookies" className="hover:underline">
              Cookies
            </Link>
            <Link href="/legal/terminos" className="hover:underline">
              Terminos
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
