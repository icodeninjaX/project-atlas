import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { MAX_CAPTURE_FILE_BYTES } from "@/lib/capture/media";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const oldKey = process.env.OPENAI_API_KEY;
const oldFetch = globalThis.fetch;

function upload(name: string, bytes: Uint8Array) {
  const file = new File([bytes as BlobPart], name);
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.buffer,
  });
  const form = new FormData();
  form.set("file", file);
  return { headers: new Headers(), formData: async () => form } as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } } });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  });
});
afterEach(() => {
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = oldKey;
  globalThis.fetch = oldFetch;
});

describe("Capture media extraction", () => {
  it("rejects unauthenticated and disguised files before provider disclosure", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    expect(
      (
        await POST(
          upload(
            "receipt.png",
            Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
          ),
        )
      ).status,
    ).toBe(401);
    expect(
      (await POST(upload("receipt.pdf", new TextEncoder().encode("not pdf"))))
        .status,
    ).toBe(415);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("stops an oversized streamed upload before parsing or contacting a provider", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CAPTURE_FILE_BYTES + 100_001));
        controller.close();
      },
    });
    const request = {
      url: "http://localhost/api/capture/extract",
      headers: new Headers(),
      body,
    } as Request;
    expect((await POST(request)).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("extracts image text transiently and includes a source fingerprint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                { type: "output_text", text: "Total ₱380.00 at Acme today" },
              ],
            },
          ],
        }),
      }),
    );
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
    const response = await POST(upload("receipt.png", bytes));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: "Total ₱380.00 at Acme today",
      source: { kind: "image", method: "vision", label: "receipt.png" },
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.store).toBe(false);
    expect(body.input[0].content[0].type).toBe("input_image");
  });

  it("returns UTF-8 document text without sending it to a model", async () => {
    const response = await POST(
      upload(
        "note.txt",
        new TextEncoder().encode("Remind me to call Acme tomorrow"),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: { kind: "document" },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("transcribes an audio note through the dedicated transcription endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "Spent eight hundred pesos on gas" }),
      }),
    );
    const response = await POST(
      upload("note.wav", new TextEncoder().encode("RIFF0000WAVEaudio")),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: { kind: "audio", method: "transcription" },
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "https://api.openai.com/v1/audio/transcriptions",
    );
    const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("model")).toBe("gpt-transcribe");
  });

  it("sends a PDF as a file input and rejects incomplete extraction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "incomplete",
          output: [{ content: [{ type: "output_text", text: "Total 100" }] }],
        }),
      }),
    );
    const response = await POST(
      upload("receipt.pdf", new TextEncoder().encode("%PDF-1.4 example")),
    );
    expect(response.status).toBe(422);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.input[0].content[0].type).toBe("input_file");
  });
});
