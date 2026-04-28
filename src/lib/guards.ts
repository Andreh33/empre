/**
 * Guards reutilizables en server components.
 * Todos lanzan redirect si la condicion no se cumple.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/db/schema";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect(session.user.role === "CLIENT" ? "/panel" : "/admin");
  }
  return session;
}

export async function requireAdmin() {
  return requireRole(["ADMIN", "SUPER_ADMIN"]);
}

export async function requireSuperAdmin() {
  return requireRole(["SUPER_ADMIN"]);
}

export async function requireClient() {
  return requireRole(["CLIENT"]);
}
