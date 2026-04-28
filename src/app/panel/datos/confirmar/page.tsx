import Link from "next/link";
import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { confirmSensitiveChangeAction } from "@/actions/profile";

export const metadata: Metadata = { title: "Confirmar cambio" };

export default async function ConfirmSensitiveChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireClient();
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Falta el token de confirmacion.
        </p>
        <Link href="/panel/datos" className="text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const fd = new FormData();
  fd.set("token", token);
  const result = await confirmSensitiveChangeAction(fd);

  if (result.ok) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          Cambio de {result.data?.tipo} aplicado correctamente.
        </p>
        <Link href="/panel/datos" className="text-primary underline">
          Volver a mis datos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{result.message}</p>
      <Link href="/panel/datos" className="text-primary underline">
        Volver
      </Link>
    </div>
  );
}
