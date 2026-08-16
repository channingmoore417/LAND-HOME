import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const runtime = "edge";

// Google Fonts serves woff2 by default, which satori (the renderer behind
// ImageResponse) can't parse — an old-browser UA forces a ttf response.
const LEGACY_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2";

async function loadGoogleFont(family: string, weight: number, text: string) {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": LEGACY_UA } },
    )
  ).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/);
  if (!match) throw new Error(`no font url for ${family}`);
  const res = await fetch(match[1]);
  return res.arrayBuffer();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || site.name;
  const kicker = searchParams.get("kicker") || "";
  const photoUrl = searchParams.get("photo") || site.teamPhotoUrl;

  const text = `${title}${kicker}${site.name}`;
  let fonts: { name: string; data: ArrayBuffer; weight: 700 | 600; style: "normal" }[] = [];
  try {
    const [bold, semibold] = await Promise.all([
      loadGoogleFont("Outfit", 700, text),
      loadGoogleFont("Outfit", 600, text),
    ]);
    fonts = [
      { name: "Outfit", data: bold, weight: 700, style: "normal" },
      { name: "Outfit", data: semibold, weight: 600, style: "normal" },
    ];
  } catch {
    // Font fetch failed — fall back to satori's default sans-serif rather than 500ing.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          fontFamily: fonts.length ? "Outfit" : "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(22,56,72,0.94) 0%, rgba(22,56,72,0.72) 38%, rgba(22,56,72,0.15) 68%, rgba(22,56,72,0.05) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 56,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logoUrl} width={44} height={44} style={{ objectFit: "contain" }} />
          <div
            style={{
              display: "flex",
              marginLeft: 14,
              fontSize: 22,
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
            bottom: 52,
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
