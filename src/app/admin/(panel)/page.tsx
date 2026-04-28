import Link from "next/link";
import {
  Users,
  FileText,
  MessageSquare,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const cards: DashboardCard[] = [
  {
    title: "Clientes",
    description: "Listado, busqueda, alta manual y edicion de fichas.",
    icon: Users,
    href: "/admin/clientes",
  },
  {
    title: "Documentos",
    description: "Subidas recientes y archivos pendientes por cliente.",
    icon: FileText,
    href: "/admin/documentos",
  },
  {
    title: "Chat",
    description: "Conversaciones recientes con clientes y mensajes sin leer.",
    icon: MessageSquare,
    href: "/admin/mensajes",
  },
  {
    title: "Calendario fiscal",
    description: "Vencimientos y eventos para todos los clientes.",
    icon: CalendarDays,
    href: "/admin/calendario",
  },
  {
    title: "Auditoria",
    description: "Registro de accesos y acciones del sistema.",
    icon: ClipboardList,
    href: "/admin/auditoria",
  },
  {
    title: "Mi seguridad",
    description: "Cambia tu contraseña y revisa la actividad de tu cuenta.",
    icon: ShieldCheck,
    href: "/admin/seguridad",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard administrativo</h1>
        <p className="text-muted-foreground">
          Acceso autorizado. Gestiona clientes, documentos cifrados, mensajeria y el calendario
          fiscal desde aqui.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <DashboardCardItem key={card.title} card={card} />
        ))}
      </ul>
    </div>
  );
}

function DashboardCardItem({ card }: { card: DashboardCard }) {
  const Icon = card.icon;
  return (
    <li>
      <Link
        href={card.href}
        className={cn(
          "group flex h-full flex-col gap-3 rounded-lg border bg-card p-5 cursor-pointer",
          "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground group-hover:text-primary">{card.title}</p>
          <p className="text-sm text-muted-foreground">{card.description}</p>
        </div>
        <p className="mt-auto text-xs font-medium uppercase tracking-wide text-primary">
          Acceder
        </p>
      </Link>
    </li>
  );
}
