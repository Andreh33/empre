import Link from "next/link";
import { Users, FileText, MessageSquare, CalendarDays, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCard {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface ActiveCard extends BaseCard {
  href: string;
  disabled?: false;
}

interface DisabledCard extends BaseCard {
  disabled: true;
  phase: string;
}

type DashboardCard = ActiveCard | DisabledCard;

const cards: DashboardCard[] = [
  {
    title: "Clientes",
    description: "Listado, busqueda, alta manual y edicion de fichas.",
    icon: Users,
    href: "/admin/clientes",
  },
  {
    title: "Documentos",
    description: "Carpetas y archivos cifrados (Fase 4).",
    icon: FileText,
    disabled: true,
    phase: "Fase 4",
  },
  {
    title: "Chat",
    description: "Mensajeria con clientes (Fase 5).",
    icon: MessageSquare,
    disabled: true,
    phase: "Fase 5",
  },
  {
    title: "Calendario fiscal",
    description: "Vencimientos y recordatorios (Fase 6).",
    icon: CalendarDays,
    disabled: true,
    phase: "Fase 6",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard administrativo</h1>
        <p className="text-muted-foreground">
          Acceso autorizado. En la Fase 3 anyadiremos gestion de clientes, en la Fase 4 documentos,
          en la Fase 5 chat, etc.
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

  if (card.disabled) {
    return (
      <li
        aria-disabled="true"
        className={cn(
          "relative flex h-full flex-col gap-3 rounded-lg border bg-card p-5 opacity-60",
          "cursor-not-allowed select-none",
        )}
      >
        <span
          className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          aria-label={`Estado: proximamente, ${card.phase}`}
        >
          {card.phase}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{card.title}</p>
          <p className="text-sm text-muted-foreground">{card.description}</p>
        </div>
        <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Proximamente
        </p>
      </li>
    );
  }

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
