"use client";

/**
 * Banner de cookies con consentimiento granular.
 * Persiste la decision en localStorage para que la UI no la pida cada vez.
 * El registro RGPD se guarda en BBDD via /api/consent (opcional, en sesion
 * autenticada).
 */
import { useEffect, useState } from "react";

const KEY = "asesoria.cookies.v1";

interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(KEY);
    if (!stored) setOpen(true);
  }, []);

  function decide(state: ConsentState) {
    localStorage.setItem(KEY, JSON.stringify(state));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-2xl">
      <div className="mx-auto max-w-3xl space-y-3 text-sm">
        <p className="font-semibold">Tu privacidad importa</p>
        <p className="text-muted-foreground">
          Usamos cookies necesarias para que la plataforma funcione. Las analiticas y de marketing
          son opcionales y solo se activan si las aceptas. Mas info en la{" "}
          <a href="/legal/cookies" className="text-primary underline">
            politica de cookies
          </a>
          .
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded border p-2 text-xs">
            <input type="checkbox" checked disabled />
            Necesarias (siempre)
          </label>
          <label className="flex items-center gap-2 rounded border p-2 text-xs">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Analiticas
          </label>
          <label className="flex items-center gap-2 rounded border p-2 text-xs">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            Marketing
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              decide({
                necessary: true,
                analytics: false,
                marketing: false,
                decidedAt: new Date().toISOString(),
              })
            }
            className="h-10 rounded-md border px-3 text-xs"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={() =>
              decide({
                necessary: true,
                analytics,
                marketing,
                decidedAt: new Date().toISOString(),
              })
            }
            className="h-10 rounded-md border px-3 text-xs"
          >
            Guardar mi seleccion
          </button>
          <button
            type="button"
            onClick={() =>
              decide({
                necessary: true,
                analytics: true,
                marketing: true,
                decidedAt: new Date().toISOString(),
              })
            }
            className="h-10 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
