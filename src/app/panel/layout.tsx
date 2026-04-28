import Link from "next/link";
import { requireClient } from "@/lib/guards";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient();

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-brand text-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/panel" className="font-semibold">
            Mi area
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/80 md:inline">{session.user.email}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="container flex gap-4 overflow-x-auto pb-2 text-sm text-white/80">
          <Link href="/panel" className="hover:text-gold">
            Inicio
          </Link>
          <Link href="/panel/datos" className="hover:text-gold">
            Mis datos
          </Link>
          <Link href="/panel/documentos" className="hover:text-gold">
            Documentos
          </Link>
          <Link href="/panel/mensajes" className="hover:text-gold">
            Mensajes
          </Link>
          <Link href="/panel/calendario" className="hover:text-gold">
            Calendario
          </Link>
          <Link href="/panel/privacidad" className="hover:text-gold">
            Privacidad
          </Link>
          <Link href="/panel/seguridad" className="hover:text-gold">
            Seguridad
          </Link>
        </nav>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
