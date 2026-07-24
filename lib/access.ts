import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "safeship_demo_access";
const COOKIE_TTL_SECONDS = 8 * 60 * 60;
const RUN_WINDOW_MS = 10 * 60 * 1000;
const MAX_RUNS_PER_WINDOW = 5;

const runWindows = new Map<string, number[]>();

function configuredCode(): string | null {
  const code = process.env.SAFESHIP_DEMO_ACCESS_CODE?.trim();
  return code ? code : null;
}

function productionProtectionRequired(): boolean {
  // NODE_ENV covers any production server, while VERCEL_ENV also catches a
  // production target if framework/runtime configuration overrides NODE_ENV.
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

function signature(sessionId: string, code: string): string {
  return createHmac("sha256", code).update(sessionId).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=") || null;
  }
  return null;
}

function verifiedSessionId(request: Request): string | null {
  const code = configuredCode();
  if (!code) return "access-not-required";

  const token = readCookie(request);
  if (!token) return null;
  const separator = token.indexOf(".");
  if (separator === -1) return null;

  const sessionId = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!sessionId || !providedSignature) return null;
  return safeEqual(providedSignature, signature(sessionId, code)) ? sessionId : null;
}

export function demoAccessStatus(request: Request): {
  required: boolean;
  authorized: boolean;
  configured: boolean;
} {
  const configured = configuredCode() !== null;
  const required = configured || productionProtectionRequired();
  return {
    required,
    authorized: configured
      ? verifiedSessionId(request) !== null
      : !productionProtectionRequired(),
    configured,
  };
}

export function authorizeDemoCode(input: string): string | null {
  const code = configuredCode();
  if (!code) return null;
  if (!safeEqual(input.trim(), code)) return null;
  return createAccessCookie(randomUUID(), code);
}

function createAccessCookie(sessionId: string, code: string): string {
  const token = code ? `${sessionId}.${signature(sessionId, code)}` : sessionId;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_TTL_SECONDS}${secure}`;
}

export function requireDemoAccess(request: Request): Response | null {
  const status = demoAccessStatus(request);
  if (status.authorized) return null;
  if (!status.configured) {
    return Response.json(
      {
        error:
          "Production access protection is not configured. Set SAFESHIP_DEMO_ACCESS_CODE.",
      },
      { status: 503 },
    );
  }
  return Response.json(
    { error: "Demo access is required before using live integrations" },
    { status: 401 },
  );
}

export function consumeGateQuota(request: Request): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const sessionId =
    verifiedSessionId(request) ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  const active = (runWindows.get(sessionId) ?? []).filter(
    (startedAt) => now - startedAt < RUN_WINDOW_MS,
  );

  if (active.length >= MAX_RUNS_PER_WINDOW) {
    const retryAfterMs = RUN_WINDOW_MS - (now - active[0]!);
    runWindows.set(sessionId, active);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  active.push(now);
  runWindows.set(sessionId, active);
  return {
    allowed: true,
    remaining: MAX_RUNS_PER_WINDOW - active.length,
    retryAfterSeconds: 0,
  };
}
