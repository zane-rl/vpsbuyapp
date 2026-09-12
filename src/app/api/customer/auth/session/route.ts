import { NextResponse } from "next/server";
import { getCustomerPrincipal } from "@/lib/customerAuth";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** 供客户门户在历史回退或 BFCache 恢复时复核会话。 */
export async function GET() {
  const principal = await getCustomerPrincipal();
  if (!principal || principal.mustChangePassword) {
    return NextResponse.json({ error: "登录已失效" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
