import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { listClients } from "@/services/client-profile";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Clientes" };

interface PageProps {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { q, tipo, page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? "1"));

  const tipoCliente =
    tipo === "PARTICULAR" || tipo === "AUTONOMO" || tipo === "SOCIEDAD" ? tipo : undefined;

  const { items, total } = await listClients({
    search: q,
    tipoCliente,
    page: pageNum,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {total} cliente{total === 1 ? "" : "s"} en total
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/nuevo">Añadir cliente</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Buscar (nombre, apellidos, email, telefono o DNI)
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            placeholder="Maria, garcia, 12345678Z..."
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="tipo" className="text-xs font-medium text-muted-foreground">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo ?? ""}
            className="h-11 rounded-md border border-input bg-background px-3"
          >
            <option value="">Todos</option>
            <option value="PARTICULAR">Particular</option>
            <option value="AUTONOMO">Autonomo</option>
            <option value="SOCIEDAD">Sociedad</option>
          </select>
        </div>
        <Button type="submit">Filtrar</Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="hidden p-3 md:table-cell">Telefono</th>
              <th className="hidden p-3 md:table-cell">Ciudad</th>
              <th className="p-3">Tipo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.userId} className="border-t">
                  <td className="p-3 font-medium">
                    {c.apellidos}, {c.nombre}
                  </td>
                  <td className="p-3 text-muted-foreground">{c.email}</td>
                  <td className="hidden p-3 text-muted-foreground md:table-cell">{c.telefono}</td>
                  <td className="hidden p-3 text-muted-foreground md:table-cell">{c.ciudad}</td>
                  <td className="p-3 text-xs uppercase">{c.tipoCliente}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/clientes/${c.userId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/admin/clientes", query: { q, tipo, page: p } }}
              className={
                p === pageNum
                  ? "rounded-md bg-primary px-3 py-1 text-primary-foreground"
                  : "rounded-md border px-3 py-1 hover:bg-accent"
              }
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
