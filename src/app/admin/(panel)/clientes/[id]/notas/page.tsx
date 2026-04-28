import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";
import { listNotes } from "@/services/internal-notes";
import { NewNoteForm } from "./new-note-form";
import { DeleteNoteButton } from "./delete-button";

export const metadata: Metadata = { title: "Notas internas" };

export default async function ClienteNotasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [u] = await db
    .select({ role: schema.users.role, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!u || u.role !== "CLIENT") notFound();

  const notes = await listNotes(id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Notas internas</p>
        <h1 className="text-2xl font-bold">{u.email}</h1>
        <p className="text-xs text-muted-foreground">
          Privadas. Nunca se muestran al cliente.
        </p>
        <Link
          href={`/admin/clientes/${id}`}
          className="mt-1 inline-block text-sm text-muted-foreground hover:underline"
        >
          Volver
        </Link>
      </div>

      <NewNoteForm clientUserId={id} />

      <ul className="space-y-3">
        {notes.length === 0 ? (
          <li className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Aun no hay notas.
          </li>
        ) : null}
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border bg-card p-4">
            <p className="whitespace-pre-wrap text-sm">{n.contenido}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {n.authorEmail} · {new Date(n.createdAt).toLocaleString("es-ES")}
              </span>
              <DeleteNoteButton id={n.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
