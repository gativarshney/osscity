import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home screen icon: three towers with lit windows on a night sky. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          padding: "0 0 24px",
          background: "linear-gradient(180deg, #0b0e1a 0%, #141d33 100%)",
        }}
      >
        <div style={{ width: 30, height: 64, background: "#2a3450", borderRadius: 4 }} />
        <div style={{ width: 40, height: 116, background: "#3a4766", borderRadius: 4, display: "flex", flexWrap: "wrap", gap: 8, padding: 10, alignContent: "flex-start" }}>
          <div style={{ width: 8, height: 8, background: "#f2c57c" }} />
          <div style={{ width: 8, height: 8, background: "#f2c57c" }} />
          <div style={{ width: 8, height: 8, background: "#f2c57c" }} />
          <div style={{ width: 8, height: 8, background: "#f2c57c", opacity: 0.4 }} />
          <div style={{ width: 8, height: 8, background: "#f2c57c" }} />
        </div>
        <div style={{ width: 34, height: 88, background: "#2f3a58", borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
