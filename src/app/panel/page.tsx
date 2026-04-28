import Link from "next/link";
import { requireClient } from "@/lib/guards";
import { getProfileByUserId } from "@/services/client-profile";

export default async function PanelHome() {
  const session = await requireClient();
  const profile = await getProfileByUserId(session.user.id);
  const nombre = profile ? `${profile.nombre}` : session.user.email;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hola, {nombre}</h1>
      <p className="text-muted-foreground">
        Bienvenido/a a tu area privada. La gestion documental, el chat y el calendario fiscal
        llegaran en proximas fases.
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Mis datos</p>
          <p className="text-sm text-muted-foreground">
            Revisa y actualiza tu informacion personal.
          </p>
          <Link href="/panel/datos" className="mt-2 inline-block text-sm text-primary underline">
            Ir a mis datos
          </Link>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Seguridad</p>
          <p className="text-sm text-muted-foreground">
            Cambia tu contraseña o gestiona tu privacidad.
          </p>
          <Link
            href="/panel/seguridad"
            className="mt-2 inline-block text-sm text-primary underline"
          >
            Ir a seguridad
          </Link>
        </li>
      </ul>
    </div>
  );
}
