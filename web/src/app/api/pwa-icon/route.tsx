import { ImageResponse } from "next/og";

export const runtime = "edge";

function iconSize(raw: string | null) {
  const n = Number(raw);
  if (n === 512) return 512;
  return 192;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = iconSize(searchParams.get("size"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1115",
          borderRadius: size >= 512 ? 96 : 36,
          color: "#ffffff",
          fontSize: Math.round(size * 0.42),
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        H
      </div>
    ),
    { width: size, height: size }
  );
}
