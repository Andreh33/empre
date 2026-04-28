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
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
