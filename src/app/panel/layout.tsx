import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireClient } from "@/lib/guards";
import { db, schema } from "@/db";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient();

  // Forzar onboarding si no se ha completado.
  const [user] = await db
    .select({ onboardingCompleted: schema.users.onboardingCompleted })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  const h = await headers();
  const path = h.get("x-pathname") ?? h.get("next-url") ?? "";
  const onOnboarding = path.includes("/panel/onboarding");
  if (user && !user.onboardingCompleted && !onOnboarding) {
    redirect("/panel/onboarding");
  }

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
          <Link href="/panel/seguridad" className="hover:text-gold">
            Seguridad
          </Link>
        </nav>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
