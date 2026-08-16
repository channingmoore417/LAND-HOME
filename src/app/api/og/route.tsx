import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const runtime = "edge";

// satori (the renderer behind ImageResponse) throws hard if zero fonts are
// loaded — it has no built-in default. Fetching a font from Google Fonts at
// request time was unreliable (every single request failed in production:
// "No fonts are loaded"), so instead we serve a font bundled with the repo
// as a same-origin static asset — no external dependency, can't flake.
async function loadLocalFont(req: Request): Promise<ArrayBuffer> {
  const url = new URL("/fonts/noto-sans-regular.ttf", req.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

// satori (the renderer behind ImageResponse) fetches <img src> URLs itself,
// with no control over headers — Cotality's photo CDN and our logo CDN both
// silently fail that fetch (satori swallows the error and renders nothing,
// no exception), leaving a blank canvas. Fetching ourselves with a real
// browser UA/Accept and inlining as a data URI sidesteps that entirely.
async function toDataUri(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return undefined;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || site.name;
  const kicker = searchParams.get("kicker") || "";
  const photoUrl = searchParams.get("photo") || site.teamPhotoUrl;

  const [photoData, logoData, fontData] = await Promise.all([
    toDataUri(photoUrl),
    toDataUri(site.logoUrl),
    loadLocalFont(req),
  ]);
  const fonts = [{ name: "Noto Sans", data: fontData, weight: 400 as const, style: "normal" as const }];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          // Solid brand color under everything — if the photo fetch fails
          // for any reason, this still renders a real branded card instead
          // of a blank canvas.
          backgroundColor: "#163848",
          fontFamily: "Noto Sans",
        }}
      >
        {photoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoData}
            width={1200}
            height={630}
            style={{ position: "absolute", inset: 0, objectFit: "cover" }}
          />
        ) : null}
        {/* Soft transition zone above the solid band, so the photo doesn't
            hard-cut into brand color. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 300,
            height: 180,
            display: "flex",
            background: "linear-gradient(to top, rgba(15,38,50,0.9) 0%, rgba(15,38,50,0) 100%)",
          }}
        />
        {/* Near-opaque brand-teal band — deliberately solid, not a soft
            alpha blend, so it reads as a clean brand color instead of
            muddying into whatever's in the photo underneath (grass, sky,
            siding, etc). */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 300,
            display: "flex",
            backgroundColor: "rgba(15,38,50,0.96)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(15,38,50,0.82)",
            borderRadius: 12,
            padding: "10px 20px 10px 12px",
          }}
        >
          {logoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoData} width={56} height={56} style={{ objectFit: "contain" }} />
          ) : null}
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              fontSize: 26,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            {site.name}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {kicker ? (
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                color: "#61C1CC",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
