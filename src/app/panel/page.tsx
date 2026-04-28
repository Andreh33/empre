import Link from "next/link";
import { requireClient } from "@/lib/guards";

export default async function PanelHome() {
  const session = await requireClient();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hola, {session.user.email}</h1>
      <p className="text-muted-foreground">
        Bienvenido/a a tu area privada. La gestion documental, el chat y el calendario fiscal
        llegaran en proximas fases.
      </p>
      {!session.user.twoFactorEnabled ? (
        <div className="rounded-md border border-gold/40 bg-gold/10 p-4 text-sm">
          <p className="font-medium">Refuerza tu seguridad</p>
          <p className="mt-1 text-muted-foreground">
            Te recomendamos activar la autenticacion en dos pasos (2FA).{" "}
            <Link href="/panel/seguridad" className="text-primary underline">
              Activar ahora
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
