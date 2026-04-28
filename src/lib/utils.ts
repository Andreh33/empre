import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper estandar de shadcn/ui para componer clases Tailwind sin colisiones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
