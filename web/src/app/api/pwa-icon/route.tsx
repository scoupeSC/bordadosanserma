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
  const maskable = searchParams.get("maskable") === "1";
  const logoUrl = new URL("/icons/logo-bordado.png", request.url).toString();
  const inset = maskable ? Math.round(size * 0.12) : Math.round(size * 0.06);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <img
          src={logoUrl}
          alt=""
          width={size - inset * 2}
          height={size - inset * 2}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
