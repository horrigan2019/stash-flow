import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Serve the Oh Stuffing HTML app at `/` from public/index.html. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
