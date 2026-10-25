import { NextRequest, NextResponse } from "next/server";
import { COOKIE, sesiValid } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (await sesiValid(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"] };
