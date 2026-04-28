"use client";

/**
 * Widget de Cloudflare Turnstile.
 * Si TURNSTILE_SITE_KEY no esta configurado (dev), no renderiza nada y la
 * accion del servidor se salta la verificacion (modo dev).
 */
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface Props {
  siteKey: string | undefined;
  onToken: (token: string) => void;
}

export function Turnstile({ siteKey, onToken }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const id = "cf-turnstile-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    const tryRender = () => {
      if (!window.turnstile || !ref.current) return false;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onToken,
      });
      return true;
    };

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [siteKey, onToken]);

  if (!siteKey) {
    return (
      <p className="text-xs text-muted-foreground">
        CAPTCHA deshabilitado en desarrollo (configura TURNSTILE_SITE_KEY).
      </p>
    );
  }

  return <div ref={ref} className="my-2" />;
}
