import { NextRequest, NextResponse } from "next/server";

// Railway's proxy sends the real host via x-forwarded-host, but the plain
// Host header (and request.url/nextUrl in a Node route handler) reflects the
// container's internal localhost:$PORT — so build the public origin by hand.
function publicOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const passcode = String(formData.get("passcode") ?? "");
  const next = String(formData.get("next") ?? "/trips");
  const origin = publicOrigin(request);

  if (passcode !== process.env.APP_PASSCODE) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, origin), {
    status: 303,
  });
  response.cookies.set("js_pass", passcode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
