"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { createNote, deleteNote } from "@/services/internal-notes";
import type { ActionResult } from "./auth";

const noteSchema = z.object({
  clientUserId: z.string().uuid(),
  contenido: z.string().trim().min(1).max(4000),
});

export async function createInternalNoteAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Solo administradores" };
  }
  const parsed = noteSchema.safeParse({
    clientUserId: formData.get("clientUserId"),
    contenido: formData.get("contenido"),
  });
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Revisa los campos" };

  await createNote({
    clientUserId: parsed.data.clientUserId,
    authorUserId: session.user.id,
    contenido: parsed.data.contenido,
  });
  return { ok: true };
}

export async function deleteInternalNoteAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, code: "FORBIDDEN", message: "Solo administradores" };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, code: "VALIDATION", message: "Falta id" };
  await deleteNote(id);
  return { ok: true };
}
