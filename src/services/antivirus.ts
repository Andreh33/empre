/**
 * Antivirus via VirusTotal v3. Si VIRUSTOTAL_API_KEY no esta presente,
 * devolvemos { status: "PENDING" } y dejamos que el archivo quede marcado
 * para revision manual. En produccion la clave es obligatoria.
 *
 * Politica:
 *   - Subida sincrona: subimos a VirusTotal y esperamos el analysis. Si
 *     llega "INFECTED" rechazamos y borramos el blob.
 *   - Para minimizar bloqueo, la API es asincrona; aqui hacemos polling
 *     limitado (max 8 s, 4 intentos cada 2 s). Si excede, marcamos como
 *     PENDING y un cron reanalizara mas tarde (placeholder fase 9).
 */
import { env } from "@/lib/env";

export type AvStatus = "PENDING" | "CLEAN" | "INFECTED" | "ERROR";

export interface AvResult {
  status: AvStatus;
  report?: Record<string, unknown>;
}

const VT_BASE = "https://www.virustotal.com/api/v3";

export async function scanWithVirusTotal(
  buffer: ArrayBuffer,
  filename: string,
): Promise<AvResult> {
  // Sin API key configurada: marcamos PENDING para revision posterior y
  // dejamos que la subida proceda. Cuando se configure la clave, un cron
  // (Fase 9 manual) puede reanalizar los archivos PENDING.
  if (!env.VIRUSTOTAL_API_KEY) {
    return { status: "PENDING", report: { skipped: "no_api_key" } };
  }

  try {
    const form = new FormData();
    form.append("file", new Blob([buffer]), filename);

    const upload = await fetch(`${VT_BASE}/files`, {
      method: "POST",
      headers: { "x-apikey": env.VIRUSTOTAL_API_KEY },
      body: form,
    });
    if (!upload.ok) {
      return { status: "ERROR", report: { upload: upload.status } };
    }
    const uploadJson = (await upload.json()) as {
      data?: { id?: string };
    };
    const analysisId = uploadJson.data?.id;
    if (!analysisId) return { status: "ERROR", report: { msg: "no_analysis_id" } };

    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const an = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
        headers: { "x-apikey": env.VIRUSTOTAL_API_KEY },
      });
      if (!an.ok) continue;
      const data = (await an.json()) as {
        data?: {
          attributes?: {
            status?: string;
            stats?: { malicious?: number; suspicious?: number };
          };
        };
      };
      const attrs = data.data?.attributes;
      if (attrs?.status !== "completed") continue;
      const malicious = attrs.stats?.malicious ?? 0;
      const suspicious = attrs.stats?.suspicious ?? 0;
      if (malicious > 0 || suspicious >= 3) {
        return { status: "INFECTED", report: attrs.stats };
      }
      return { status: "CLEAN", report: attrs.stats };
    }
    return { status: "PENDING", report: { msg: "timeout_polling" } };
  } catch (err) {
    console.error("[av] error:", err);
    return { status: "ERROR", report: { error: String(err) } };
  }
}
