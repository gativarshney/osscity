import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCityFeed } from "@/lib/city/source";
import { cityStats } from "@/lib/city/stats";

export const alt = "OSS City: every open source project from Google Summer of Code organisations, built as a city";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/** The share card: the skyline with the title and the three live numbers. */
export default async function OpenGraphImage() {
  const [skyline, feed] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "skyline.jpg")).catch(() => null),
    getCityFeed(),
  ]);
  const stats = feed ? cityStats(feed) : null;
  const background = skyline ? `url(data:image/jpeg;base64,${skyline.toString("base64")})` : "#0b0e1a";
  const numbers: [string, string][] = stats
    ? [
        [stats.projects.toLocaleString("en-GB"), "projects"],
        [stats.within7dShare == null ? "No data" : `${Math.round(stats.within7dShare * 100)}%`, "answered within 7 days"],
        [stats.freeIssues.toLocaleString("en-GB"), "free first issues"],
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: background,
          backgroundSize: "1200px 630px",
          backgroundColor: "#0b0e1a",
          color: "#f4f3ef",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            backgroundImage:
              "linear-gradient(90deg, rgba(7,9,19,0.97) 0%, rgba(7,9,19,0.9) 42%, rgba(7,9,19,0.4) 68%, rgba(7,9,19,0.08) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#7fd9d0" }} />
            Powered by Contributable
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ fontSize: 104, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>OSS City</div>
            <div style={{ fontSize: 27, lineHeight: 1.35, color: "#cfd3dc", marginTop: 18 }}>
              Every open source project from Google Summer of Code organisations, built as a city. Lit windows reply
              to newcomers fast.
            </div>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {numbers.map(([value, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>{value}</div>
                <div style={{ fontSize: 20, color: "#9aa3b5" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
