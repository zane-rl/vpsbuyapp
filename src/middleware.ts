import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  SESSION_COOKIE,
  readCustomerSessionToken,
  verifySessionToken,
} from "@/lib/auth";

// 保护管理员与客户门户页面、接口。客户账号启停与会话版本会在服务端再查库确认。
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/customer/:path*", "/api/customer/:path*"],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const customerLogin = path === "/customer/login" || path === "/api/customer/auth/login";
  if (customerLogin) return NextResponse.next();

  if (path.startsWith("/customer") || path.startsWith("/api/customer")) {
    const token = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
    const claims = await readCustomerSessionToken(token);
    if (!claims) return customerUnauthorized(req);

    const changePassword = path === "/customer/change-password" || path === "/api/customer/auth/password";
    const logout = path === "/api/customer/auth/login" && req.method === "DELETE";
    if (claims.mustChangePassword && !changePassword && !logout) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "请先修改初始密码" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/customer/change-password", req.url));
    }
    return customerNoStore(NextResponse.next());
  }

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

function customerUnauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return customerNoStore(NextResponse.json({ error: "未授权，请先登录" }, { status: 401 }));
  }
  const loginUrl = new URL("/customer/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return customerNoStore(NextResponse.redirect(loginUrl));
}

function customerNoStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
