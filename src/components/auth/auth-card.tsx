import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <Link href="/" className="flex items-center justify-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-md bg-brand font-bold text-white"
          >
            JG
          </div>
          <div className="text-center leading-tight">
            <p className="text-sm font-semibold tracking-wide">Asesoria Empresarial</p>
            <p className="text-xs text-muted-foreground">Juan Garcia S.L.</p>
          </div>
        </Link>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
