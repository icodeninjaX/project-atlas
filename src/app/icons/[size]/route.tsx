import { ImageResponse } from "next/og";

const supportedSizes = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const pixels = Number.parseInt(sizeParam, 10);
  if (!supportedSizes.has(pixels)) {
    return new Response("Not found", { status: 404 });
  }
  const maskable = sizeParam.includes("maskable");
  const markSize = maskable ? pixels * 0.48 : pixels * 0.62;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #0f766e 0%, #115e59 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          width: markSize,
          height: markSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `${Math.max(6, pixels * 0.035)}px solid rgba(255,255,255,0.92)`,
          borderRadius: pixels * 0.22,
          fontSize: pixels * 0.42,
          fontWeight: 800,
          letterSpacing: "-0.08em",
          paddingRight: pixels * 0.035,
          boxShadow: `0 ${pixels * 0.04}px ${pixels * 0.12}px rgba(0,0,0,0.24)`,
        }}
      >
        A
      </div>
    </div>,
    {
      width: pixels,
      height: pixels,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
