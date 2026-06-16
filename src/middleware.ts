import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 保护 /admin/** 页面 与 /api/admin/** 接口
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token);

  if (ok) return NextResponse.next();

  // 接口返回 401，页面重定向到登录页
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
