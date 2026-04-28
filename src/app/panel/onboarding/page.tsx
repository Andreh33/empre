import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireClient } from "@/lib/guards";
import { getProfileByUserId } from "@/services/client-profile";
import { ProfileForm } from "@/components/client/profile-form";
import { createOrUpdateProfileAction } from "@/actions/profile";

export const metadata: Metadata = { title: "Bienvenido/a - completa tu perfil" };

export default async function OnboardingPage() {
  const session = await requireClient();
  const existing = await getProfileByUserId(session.user.id);
  if (existing) redirect("/panel");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Bienvenido/a</h1>
        <p className="text-sm text-muted-foreground">
          Para empezar, necesitamos algunos datos basicos. Esto nos permite preparar tu informacion
          fiscal con precision. Puedes editar la mayoria de campos despues.
        </p>
      </div>
      <ProfileForm
        submitLabel="Guardar y continuar"
        successMessage="Perfil creado. Llevandote al panel..."
        onSubmit={createOrUpdateProfileAction}
      />
    </div>
  );
}
