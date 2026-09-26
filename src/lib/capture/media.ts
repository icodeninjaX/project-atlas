import { createHash } from "node:crypto";

export type CaptureMediaKind = "image" | "document" | "audio";
export type CaptureSource = {
  kind: "typed" | "email" | CaptureMediaKind;
  label: string;
  method: "typed" | "copied" | "vision" | "transcription" | "document";
  digest: string | null;
};

export const MAX_CAPTURE_FILE_BYTES = 4 * 1024 * 1024;

export function inspectCaptureFile(name: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CAPTURE_FILE_BYTES)
    return { error: "Choose a file between 1 byte and 4 MB." } as const;
  const head = Buffer.from(bytes.subarray(0, 16));
  const lower = name.toLowerCase();
  const png = head
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = head[0] === 255 && head[1] === 216 && head[2] === 255;
  const webp =
    head.toString("ascii", 0, 4) === "RIFF" &&
    head.toString("ascii", 8, 12) === "WEBP";
  const pdf = head.toString("ascii", 0, 5) === "%PDF-";
  const wav =
    head.toString("ascii", 0, 4) === "RIFF" &&
    head.toString("ascii", 8, 12) === "WAVE";
  const webm = head.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  const mp3 =
    head.toString("ascii", 0, 3) === "ID3" ||
    (head[0] === 255 && ((head[1] ?? 0) & 224) === 224);
  const mp4 = head.toString("ascii", 4, 8) === "ftyp";
  let kind: CaptureMediaKind;
  let mime: string;
  if (png && lower.endsWith(".png")) [kind, mime] = ["image", "image/png"];
  else if (jpg && /\.jpe?g$/.test(lower))
    [kind, mime] = ["image", "image/jpeg"];
  else if (webp && lower.endsWith(".webp"))
    [kind, mime] = ["image", "image/webp"];
  else if (pdf && lower.endsWith(".pdf"))
    [kind, mime] = ["document", "application/pdf"];
  else if (wav && lower.endsWith(".wav")) [kind, mime] = ["audio", "audio/wav"];
  else if (webm && lower.endsWith(".webm"))
    [kind, mime] = ["audio", "audio/webm"];
  else if (mp3 && lower.endsWith(".mp3"))
    [kind, mime] = ["audio", "audio/mpeg"];
  else if (mp4 && /\.(m4a|mp4)$/.test(lower))
    [kind, mime] = ["audio", "audio/mp4"];
  else if (lower.endsWith(".txt")) {
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (value.includes("\0")) throw new Error("binary text");
      [kind, mime] = ["document", "text/plain"];
    } catch {
      return { error: "This text file is not valid UTF-8." } as const;
    }
  } else
    return {
      error: "Use PNG, JPEG, WebP, PDF, TXT, MP3, M4A, MP4, WAV, or WebM.",
    } as const;
  return {
    kind,
    mime,
    digest: createHash("sha256").update(bytes).digest("hex"),
  } as const;
}

export function parseCaptureSource(value: unknown): CaptureSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (
    !["typed", "email", "image", "document", "audio"].includes(
      String(source.kind),
    ) ||
    !["typed", "copied", "vision", "transcription", "document"].includes(
      String(source.method),
    ) ||
    typeof source.label !== "string" ||
    source.label.length < 1 ||
    source.label.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(source.label) ||
    (source.digest !== null &&
      (typeof source.digest !== "string" ||
        !/^[a-f0-9]{64}$/.test(source.digest)))
  )
    return null;
  const expected: Record<CaptureSource["kind"], CaptureSource["method"]> = {
    typed: "typed",
    email: "copied",
    image: "vision",
    document: "document",
    audio: "transcription",
  };
  if (source.method !== expected[source.kind as CaptureSource["kind"]])
    return null;
  return {
    kind: source.kind as CaptureSource["kind"],
    label: source.label,
    method: source.method as CaptureSource["method"],
    digest: source.digest as string | null,
  };
}
