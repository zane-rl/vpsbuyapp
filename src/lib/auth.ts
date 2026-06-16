// 轻量鉴权：单管理员密码 + HMAC-SHA256 签名 Cookie 会话。
// 使用 Web Crypto API（globalThis.crypto.subtle），同时兼容 Edge(middleware) 与 Node(route handler)。

export const SESSION_COOKIE = "vps_session";
// 会话有效期（秒）：7 天
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error("SESSION_SECRET 未配置或过短（至少 8 字符）");
  }
  return secret;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBase64url(s: string): string {
  return bytesToBase64url(encoder.encode(s));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 校验明文密码是否正确 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD 未配置");
  if (typeof password !== "string" || password.length !== expected.length) return false;
  return safeEqual(password, expected);
}

/** 生成签名会话 token */
export async function createSessionToken(): Promise<string> {
  const payload = strToBase64url(`authed.${SESSION_MAX_AGE}`);
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** 校验会话 token 是否合法 */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const expected = await hmac(payload);
    return safeEqual(sig, expected);
  } catch {
    return false;
  }
}
