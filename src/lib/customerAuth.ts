import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  readCustomerSessionToken,
} from "./auth";

const KEY_LENGTH = 64;

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export function normalizeUsername(username: unknown): { username: string; usernameKey: string } | { error: string } {
  const normalized = typeof username === "string" ? username.trim().normalize("NFKC") : "";
  if (normalized.length < 3 || normalized.length > 64) {
    return { error: "用户名长度应为 3–64 个字符" };
  }
  if (/[\s\p{C}]/u.test(normalized)) {
    return { error: "用户名不能包含空格或控制字符" };
  }
  return { username: normalized, usernameKey: normalized.toLocaleLowerCase("en-US") };
}

export function validateCustomerPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return "密码长度应为 8–128 个字符";
  }
  return null;
}

export async function hashCustomerPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyCustomerPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  try {
    const actual = await scrypt(password, salt);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export type CustomerPrincipal = {
  accountId: string;
  customerId: string;
  username: string;
  mustChangePassword: boolean;
  sessionVersion: number;
};

/** 从 Cookie 读取客户身份，并查库确认账号仍启用且凭据版本未变化。 */
export async function getCustomerPrincipal(): Promise<CustomerPrincipal | null> {
  const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value;
  const claims = await readCustomerSessionToken(token);
  if (!claims) return null;

  const account = await prisma.customerAccount.findUnique({ where: { id: claims.accountId } });
  if (
    !account ||
    !account.enabled ||
    account.customerId !== claims.customerId ||
    account.sessionVersion !== claims.version
  ) {
    return null;
  }

  return {
    accountId: account.id,
    customerId: account.customerId,
    username: account.username,
    mustChangePassword: account.mustChangePassword,
    sessionVersion: account.sessionVersion,
  };
}

export async function issueCustomerSession(account: {
  id: string;
  customerId: string;
  sessionVersion: number;
  mustChangePassword: boolean;
}): Promise<string> {
  return createCustomerSessionToken({
    accountId: account.id,
    customerId: account.customerId,
    version: account.sessionVersion,
    mustChangePassword: account.mustChangePassword,
  });
}
