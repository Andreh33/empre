import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand text-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-semibold">
            Asesoria Juan Garcia
          </Link>
          <nav className="flex gap-3 text-xs">
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
      </header>
      <main className="container max-w-3xl space-y-4 py-10 text-sm leading-relaxed">
        {children}
      </main>
    </div>
  );
}
