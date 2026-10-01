"use client";

import { useEffect, useState } from "react";
import type { AnalystModelId } from "@/lib/ai/models";
import type {
  DigestBody,
  DigestResponse,
} from "@/lib/analyst/intelligence/digest";
import type { AnalystConsent } from "@/lib/analyst/intelligence/policy";

/** How often, and how many times, to check on a summary another view is making. */
export const DIGEST_WAIT_MS = 5_000;
const DIGEST_WAITS = 15;

/** The question "Ask about this" starts a conversation with. */
export const DIGEST_FOLLOW_UP = "Why did my spending change this month?";

export type DigestState =
  | { status: "loading" }
  | { status: "ready"; digest: DigestBody }
  | { status: "hidden" }
  | { status: "error" };

/**
 * The "this month so far" summary for the current consent. It is fetched
 * once per consent; the server keeps it for the day, so reopening the page
 * reads the kept summary rather than running a new analysis.
 */
export function useDigest(
  consent: AnalystConsent | null,
  model: AnalystModelId,
): DigestState {
  const [state, setState] = useState<DigestState>({ status: "hidden" });
  // The model a new summary would use; changing it later does not refetch.
  const [initialModel] = useState(model);
  useEffect(() => {
    if (!consent) return;
    const abort = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    const load = async () => {
      // Another view may be making today's summary: wait for it.
      for (let attempt = 0; attempt < DIGEST_WAITS; attempt += 1) {
        const response = await fetch("/api/analyst/digest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent, model: initialModel }),
          signal: abort.signal,
        });
        if (!response.ok) return setState({ status: "error" });
        const body = (await response.json()) as DigestResponse;
        if (body.digest)
          return setState({ status: "ready", digest: body.digest });
        if (body.reason !== "in_progress")
          return setState({ status: "hidden" });
        await new Promise((resolve) => setTimeout(resolve, DIGEST_WAIT_MS));
        if (abort.signal.aborted) return;
      }
      setState({ status: "error" });
    };
    load().catch(() => {
      if (!abort.signal.aborted) setState({ status: "error" });
    });
    return () => abort.abort();
  }, [consent, initialModel]);
  return consent ? state : { status: "hidden" };
}
