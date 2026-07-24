"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type AccessState =
  | { status: "checking" }
  | { status: "authorized" }
  | { status: "required"; error?: string }
  | { status: "failed"; error: string };

export default function AccessBoundary({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>({ status: "checking" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Access check failed with status ${response.status}`);
        return (await response.json()) as {
          required: boolean;
          authorized: boolean;
          configured: boolean;
        };
      })
      .then((access) => {
        if (access.required && !access.configured) {
          setState({
            status: "failed",
            error:
              "Production access protection is not configured. Set SAFESHIP_DEMO_ACCESS_CODE in Vercel.",
          });
          return;
        }
        setState(
          access.authorized || !access.required
            ? { status: "authorized" }
            : { status: "required" },
        );
      })
      .catch((error: unknown) => {
        setState({
          status: "failed",
          error: error instanceof Error ? error.message : "Could not check demo access",
        });
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as { error?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : `Access failed with status ${response.status}`,
        );
      }
      setState({ status: "authorized" });
    } catch (error) {
      setState({
        status: "required",
        error: error instanceof Error ? error.message : "Could not verify demo access",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "authorized") return children;

  return (
    <main className="access-shell">
      <section className="access-panel" aria-labelledby="access-title">
        <span className="access-index">
          Protected integration boundary / 00
        </span>
        <p className="eyebrow">Live sponsor calls are locked</p>
        <h2 id="access-title">Enter the SafeShip demo code</h2>
        <p>
          A live gate generates attacks with Fireworks and creates a Daytona
          sandbox. Unlocking requires one explicit operator code.
        </p>

        {state.status === "checking" && <p className="empty">Checking access…</p>}
        {state.status === "failed" && (
          <p className="run-error-message" role="alert">
            {state.error}
          </p>
        )}
        {state.status === "required" && (
          <form onSubmit={submit} className="access-form">
            <label htmlFor="demo-code">Demo access code</label>
            <input
              id="demo-code"
              name="demo-code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={submitting}
            />
            <button className="act" type="submit" disabled={submitting || code.trim().length === 0}>
              {submitting ? "Checking…" : "Unlock SafeShip"}
            </button>
            {state.error && (
              <p className="run-error-message" role="alert">
                {state.error}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
