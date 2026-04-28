import type { Metadata } from "next";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/guards";
import { db, schema } from "@/db";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string; from?: string; to?: string; userId?: string }>;
}) {
  await requireAdmin();
  const { accion, from, to, userId } = await searchParams;

  const conds = [] as ReturnType<typeof eq>[];
  if (
    accion &&
    (schema.ACCIONES_AUDIT as readonly string[]).includes(accion)
  ) {
    conds.push(eq(schema.auditLogs.accion, accion as (typeof schema.ACCIONES_AUDIT)[number]));
  }
  if (userId) conds.push(eq(schema.auditLogs.userId, userId));
  if (from) conds.push(gte(schema.auditLogs.createdAt, from));
  if (to) conds.push(lte(schema.auditLogs.createdAt, to));

  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(schema.auditLogs)
    .where(where)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(500);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Auditoria</h1>
      <form className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
        <select
          name="accion"
          defaultValue={accion ?? ""}
          className="h-11 rounded-md border bg-background px-3"
        >
          <option value="">Todas las acciones</option>
          {schema.ACCIONES_AUDIT.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="h-11 rounded-md border bg-background px-3"
        />
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="h-11 rounded-md border bg-background px-3"
        />
        <input
          name="userId"
          placeholder="userId (opcional)"
          defaultValue={userId ?? ""}
          className="h-11 rounded-md border bg-background px-3"
        />
        <button className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
          Filtrar
        </button>
      </form>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left uppercase">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Accion</th>
              <th className="p-2">Recurso</th>
              <th className="p-2">IP</th>
              <th className="hidden p-2 md:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString("es-ES")}
                </td>
                <td className="p-2 font-mono">{r.userId ?? "-"}</td>
                <td className="p-2 font-medium">{r.accion}</td>
                <td className="p-2 text-muted-foreground">
                  {r.recursoTipo ?? "-"}/{r.recursoId ?? "-"}
                </td>
                <td className="p-2 text-muted-foreground">{r.ip ?? "-"}</td>
                <td className="hidden max-w-md truncate p-2 text-muted-foreground md:table-cell">
                  {r.metadata ?? "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Mostrando hasta 500 entradas mas recientes. Retencion 12 meses.
      </p>
    </div>
  );
}
