import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 300,
          background:
            "linear-gradient(135deg, #ffd9e8 0%, #e6dcff 60%, #cdf5e3 100%)",
        }}
      >
        💞
      </div>
    ),
    { width: 512, height: 512 }
  );
}
