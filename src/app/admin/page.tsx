export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard administrativo</h1>
      <p className="text-muted-foreground">
        Acceso autorizado. En la Fase 3 anyadiremos gestion de clientes, en la 4 documentos, en
        la 5 chat, etc.
      </p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Clientes</p>
          <p className="text-sm text-muted-foreground">Listado y gestion (Fase 3).</p>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Documentos</p>
          <p className="text-sm text-muted-foreground">Carpetas y archivos cifrados (Fase 4).</p>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Chat</p>
          <p className="text-sm text-muted-foreground">Mensajeria con clientes (Fase 5).</p>
        </li>
        <li className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Calendario fiscal</p>
          <p className="text-sm text-muted-foreground">Vencimientos y recordatorios (Fase 6).</p>
        </li>
      </ul>
    </div>
  );
}
