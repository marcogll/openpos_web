import { createHmac, timingSafeEqual } from "crypto";
import type { MiddlewareHandler } from "hono";

type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "cashier";
  exp: number;
};

const JWT_SECRET = process.env.POS_JWT_SECRET || "openpos-dev-secret-change-me";

const base64UrlEncode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const base64UrlDecode = <T>(value: string): T =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;

const sign = (input: string) =>
  createHmac("sha256", JWT_SECRET).update(input).digest("base64url");

const isPublicRequest = (path: string, method: string) =>
  path === "/" ||
  (path === "/auth/login" && method === "POST") ||
  (path === "/auth/setup") ||
  (path === "/config" && method === "GET");

export const createToken = (user: Omit<AuthUser, "exp">) => {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: AuthUser = { ...user, exp: Date.now() + 86_400_000 };
  const unsigned = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  return `${unsigned}.${sign(unsigned)}`;
};

export const verifyToken = (token: string): AuthUser | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const user = base64UrlDecode<AuthUser>(payload);
  if (!user.id || !user.username || !user.role || user.exp < Date.now()) return null;
  return user;
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (isPublicRequest(new URL(c.req.url).pathname.replace(/^\/api/, "") || "/", c.req.method)) {
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = verifyToken(authHeader.slice(7));
  if (!user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("user", user);
  return next();
};

export const requireRole = (...roles: AuthUser["role"][]): MiddlewareHandler => async (c, next) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!roles.includes(user.role)) return c.json({ error: "Forbidden" }, 403);
  return next();
};

