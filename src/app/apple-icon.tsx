import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          background:
            "linear-gradient(135deg, #ffd9e8 0%, #e6dcff 60%, #cdf5e3 100%)",
        }}
      >
        💞
      </div>
    ),
    { ...size }
  );
}
