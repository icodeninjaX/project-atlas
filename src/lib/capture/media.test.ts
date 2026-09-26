import { describe, expect, it } from "vitest";
import {
  inspectCaptureFile,
  MAX_CAPTURE_FILE_BYTES,
  parseCaptureSource,
} from "./media";

describe("Capture file validation", () => {
  it("accepts a signed image and returns a stable duplicate fingerprint", () => {
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
    const first = inspectCaptureFile("receipt.png", bytes);
    expect(first).toMatchObject({ kind: "image", mime: "image/png" });
    expect(first).toEqual(inspectCaptureFile("receipt.png", bytes));
    expect(inspectCaptureFile("receipt.pdf", bytes)).toHaveProperty("error");
  });

  it("rejects invalid or disguised text and oversized input", () => {
    expect(
      inspectCaptureFile("note.txt", Uint8Array.from([255])),
    ).toHaveProperty("error");
    expect(
      inspectCaptureFile("note.txt", Uint8Array.from([65, 0, 66])),
    ).toHaveProperty("error");
    expect(
      inspectCaptureFile("note.pdf", new TextEncoder().encode("not a pdf")),
    ).toHaveProperty("error");
    expect(
      inspectCaptureFile(
        "huge.txt",
        new Uint8Array(MAX_CAPTURE_FILE_BYTES + 1),
      ),
    ).toHaveProperty("error");
  });

  it("requires a coherent source and bounded provenance", () => {
    const source = {
      kind: "audio",
      label: "note.webm",
      method: "transcription",
      digest: "a".repeat(64),
    };
    expect(parseCaptureSource(source)).toEqual(source);
    expect(parseCaptureSource({ ...source, method: "vision" })).toBeNull();
    expect(parseCaptureSource({ ...source, digest: "wrong" })).toBeNull();
  });
});
