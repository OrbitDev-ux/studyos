import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 18,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 22 22" fill="none">
              <path
                d="M6 11.5 9.5 15 16 7"
                stroke="#0a0a0a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#ffffff" }}>
            {siteConfig.name}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#a1a1aa" }}>
          AI가 문제를 만들고 공부를 분석하는 학습 플랫폼
        </div>
      </div>
    ),
    size,
  );
}
