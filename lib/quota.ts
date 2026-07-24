const RUN_WINDOW_MS = 10 * 60 * 1000;
const MAX_RUNS_PER_WINDOW = 5;

const runWindows = new Map<string, number[]>();

export function consumeGateQuota(request: Request): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const clientId =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  const active = (runWindows.get(clientId) ?? []).filter(
    (startedAt) => now - startedAt < RUN_WINDOW_MS,
  );

  if (active.length >= MAX_RUNS_PER_WINDOW) {
    const retryAfterMs = RUN_WINDOW_MS - (now - active[0]!);
    runWindows.set(clientId, active);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  active.push(now);
  runWindows.set(clientId, active);
  return {
    allowed: true,
    remaining: MAX_RUNS_PER_WINDOW - active.length,
    retryAfterSeconds: 0,
  };
}
