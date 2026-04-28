/**
 * Deteccion de tipo de archivo por extension Y magic number.
 * Bloquea ejecutables y formatos no permitidos antes de tocar Blob/antivirus.
 */
export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "odt",
  "xls",
  "xlsx",
  "ods",
  "csv",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "heic",
  "heif",
  "webp",
  "zip",
] as const;

const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "psm1", "vbs", "js",
  "jar", "apk", "app", "sh", "bash", "dmg", "iso", "deb", "rpm", "msu",
  "lnk", "reg", "wsh", "wsf", "html", "htm", "svg", "xml",
]);

const MAGIC_NUMBERS: { ext: string; bytes: number[]; offset?: number }[] = [
  // PDF: 25 50 44 46
  { ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  // DOCX/XLSX/ODT/ODS/ZIP -> ZIP container
  { ext: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  // DOC: D0 CF 11 E0 (CFB OLE)
  { ext: "doc", bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  // PNG
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  // JPG
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  // WEBP "RIFF....WEBP"
  { ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  // HEIC/HEIF: ftypheic / ftypmif1 / ftypheix at offset 4
  { ext: "heic", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

const ZIP_DERIVED = new Set(["docx", "xlsx", "odt", "ods", "zip"]);

export interface FileCheck {
  ok: boolean;
  reason?: string;
  detectedKind?: string;
  extension: string;
}

export function checkFile(filename: string, head: Uint8Array, size: number, maxBytes: number): FileCheck {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (size > maxBytes) {
    return { ok: false, reason: `Tamaño ${size} > máximo ${maxBytes}`, extension: ext };
  }
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `Extension .${ext} bloqueada`, extension: ext };
  }
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return { ok: false, reason: `Extension .${ext} no permitida`, extension: ext };
  }

  // Magic number: aceptamos si coincide con el ext, o si ext es ZIP_DERIVED y
  // el magic es ZIP, o txt/csv (sin magic).
  const matched = MAGIC_NUMBERS.find((m) => {
    const off = m.offset ?? 0;
    if (head.length < off + m.bytes.length) return false;
    return m.bytes.every((b, i) => head[off + i] === b);
  });

  if (ext === "txt" || ext === "csv") {
    return { ok: true, detectedKind: ext, extension: ext };
  }
  if (!matched) {
    return { ok: false, reason: "Magic number no reconocido", extension: ext };
  }
  if (matched.ext === ext) return { ok: true, detectedKind: matched.ext, extension: ext };
  if (matched.ext === "zip" && ZIP_DERIVED.has(ext)) {
    return { ok: true, detectedKind: matched.ext, extension: ext };
  }
  if ((ext === "jpeg" && matched.ext === "jpg") || (ext === "heif" && matched.ext === "heic")) {
    return { ok: true, detectedKind: matched.ext, extension: ext };
  }
  return {
    ok: false,
    reason: `Magic number ${matched.ext} no coincide con .${ext}`,
    extension: ext,
  };
}
