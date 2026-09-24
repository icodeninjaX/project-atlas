import "server-only";
import { ToolFailure, TOOL_LIMITS } from "./contracts";

const tables = new Set([
  "transactions",
  "transaction_categories",
  "debts",
  "tasks",
  "job_applications",
  "goals",
  "goal_milestones",
  "weekly_reviews",
  "financial_account_balances",
  "profiles",
  "monthly_budgets",
  "budget_items",
  "user_preferences",
  "debt_payments",
  "job_application_events",
  "atlas_relationships",
  "knowledge_concepts",
]);

function safeMoney(value: unknown, sums = new Map<string, number>()): boolean {
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(([key, item]) => {
    if (key.endsWith("_centavos") && item !== null) {
      if (
        !(
          typeof item === "number" ||
          (typeof item === "string" && /^-?\d+$/.test(item))
        ) ||
        !Number.isSafeInteger(Number(item))
      )
        return false;
      const sum = (sums.get(key) ?? 0) + Math.abs(Number(item));
      sums.set(key, sum);
      return Number.isSafeInteger(sum);
    }
    return safeMoney(item, sums);
  });
}

function date(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return NaN;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(stamp) &&
    new Date(stamp).toISOString().slice(0, 10) === value
    ? stamp
    : NaN;
}

/** A fail-closed transport for a single tool execution, never a general Supabase client. */
export function createToolTransport(options: {
  ownerId: string;
  signal: AbortSignal;
  fetch: typeof globalThis.fetch;
}) {
  const stats = { queries: 0, rows: 0 };
  let totalBytes = 0;
  const moneySums = new Map<string, number>();
  let failure: ToolFailure | null = null;
  function fail(code: ToolFailure["code"], message: string): never {
    failure ??= new ToolFailure(code, message);
    // PostgREST otherwise retries thrown errors with backoff. These failures
    // are terminal for this execution; retain the typed instance and code.
    failure.name = "AbortError";
    throw failure;
  }
  function active() {
    if (failure) throw failure;
    if (options.signal.aborted) fail("timeout", "Tool retrieval timed out.");
  }
  const boundedFetch: typeof globalThis.fetch = async (input, init) => {
    active();
    try {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const auth = request.method === "GET" && url.pathname === "/auth/v1/user";
      const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
      let limit = TOOL_LIMITS.rowsPerQuery + 1;
      let sentinel = true;
      let finiteBound = Infinity;
      let paginated = false;
      if (!auth) {
        if (table && request.method === "GET" && tables.has(table)) {
          const ownerColumn = table === "profiles" ? "id" : "user_id";
          if (
            url.searchParams.getAll(ownerColumn).length !== 1 ||
            url.searchParams.get(ownerColumn) !== `eq.${options.ownerId}`
          )
            fail("invalid_input", "Owner-scoped reads are required.");
          // Relations and aggregate projections can hide unbounded nested rows.
          const select = url.searchParams.get("select") ?? "*";
          if (
            /[():]/.test(select) ||
            request.headers.has("range") ||
            url.searchParams.has("offset")
          )
            fail("invalid_input", "Unsupported retrieval projection or range.");
          const explicit = url.searchParams.get("limit");
          if (explicit !== null) {
            limit = Number(explicit);
            if (
              !/^\d+$/.test(explicit) ||
              !Number.isSafeInteger(limit) ||
              limit < 1
            )
              fail("invalid_input", "Retrieval limit is invalid.");
            sentinel = limit > TOOL_LIMITS.rowsPerQuery;
            limit = Math.min(limit, TOOL_LIMITS.rowsPerQuery + 1);
          }
          // These existing loaders explicitly describe a latest-N window or
          // consume their lookahead row to report hasMore themselves.
          paginated =
            !sentinel &&
            ((table === "weekly_reviews" &&
              limit === 12 &&
              url.searchParams.get("order") === "week_start.desc") ||
              table === "atlas_relationships" ||
              (table === "tasks" &&
                url.searchParams.get("related_goal_id")?.startsWith("eq.") ===
                  true) ||
              (table === "goal_milestones" &&
                url.searchParams.get("goal_id")?.startsWith("eq.") === true));
          const id = url.searchParams.get("id");
          if (id?.startsWith("eq.")) finiteBound = 1;
          else if (id && /^in\.\([0-9a-f,-]+\)$/i.test(id))
            finiteBound = new Set(id.slice(4, -1).split(",")).size;
          if (table === "user_preferences") finiteBound = 1;
          url.searchParams.set("limit", String(limit));
        } else if (
          rpc &&
          request.method === "POST" &&
          ["life_timeline", "runway_monthly_totals"].includes(rpc)
        ) {
          const body: Record<string, unknown> = await request.clone().json();
          if (!body || Array.isArray(body) || typeof body !== "object")
            fail("invalid_input", "Invalid read parameters.");
          if (rpc === "runway_monthly_totals") {
            const span = date(body.p_end_date) - date(body.p_start_date);
            if (
              Object.keys(body).some(
                (key) => !["p_start_date", "p_end_date"].includes(key),
              ) ||
              !Number.isFinite(span) ||
              span <= 0 ||
              span > 366 * 86400000
            )
              fail("invalid_input", "Runway period is invalid.");
          } else {
            const keys = [
              "p_query",
              "p_module",
              "p_from_date",
              "p_to_date",
              "p_before_on",
              "p_before_at",
              "p_before_id",
              "p_limit",
            ];
            if (
              Object.keys(body).some((key) => !keys.includes(key)) ||
              !Number.isInteger(body.p_limit) ||
              Number(body.p_limit) < 1 ||
              Number(body.p_limit) > 31
            )
              fail("invalid_input", "Timeline parameters are invalid.");
            if (
              (body.p_query != null &&
                (typeof body.p_query !== "string" ||
                  body.p_query.length > 120)) ||
              (body.p_module != null &&
                ![
                  "money",
                  "debt",
                  "tasks",
                  "goals",
                  "career",
                  "reviews",
                ].includes(String(body.p_module))) ||
              ["p_from_date", "p_to_date", "p_before_on"].some(
                (key) => body[key] != null && !Number.isFinite(date(body[key])),
              ) ||
              (body.p_from_date != null &&
                body.p_to_date != null &&
                date(body.p_from_date) > date(body.p_to_date)) ||
              (body.p_before_at != null &&
                (typeof body.p_before_at !== "string" ||
                  !Number.isFinite(Date.parse(body.p_before_at)))) ||
              (body.p_before_id != null &&
                (typeof body.p_before_id !== "string" ||
                  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    body.p_before_id,
                  )))
            )
              fail("invalid_input", "Timeline parameters are invalid.");
            limit = Number(body.p_limit);
            paginated = true;
          }
          if (url.search)
            fail("invalid_input", "RPC query overrides are unavailable.");
          url.searchParams.set("limit", String(limit));
        } else fail("invalid_input", "This read is not approved.");
        // Reserve before awaiting network I/O so concurrent reads share the same budget.
        if (stats.queries >= TOOL_LIMITS.queries)
          fail("budget_exceeded", "Tool query budget exceeded.");
        stats.queries += 1;
      }
      active();
      // Exact counts detect server-side API caps lower than our requested limit.
      // Without this, a short truncated response could masquerade as complete.
      const headers = new Headers(request.headers);
      if (!auth) {
        const prefer = (headers.get("prefer") ?? "")
          .split(",")
          .filter((value) => value && !value.trim().startsWith("count="));
        headers.set("prefer", [...prefer, "count=exact"].join(","));
      }
      const response = await options.fetch(url, {
        method: request.method,
        body:
          request.method === "POST" ? await request.arrayBuffer() : undefined,
        headers,
        signal: options.signal,
        redirect: "error",
      });
      active();
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (reader) {
        try {
          while (true) {
            const next = await reader.read();
            active();
            if (next.done) break;
            bytes += next.value.byteLength;
            totalBytes += next.value.byteLength;
            if (totalBytes > TOOL_LIMITS.responseBytes)
              fail("budget_exceeded", "Tool response exceeds its byte budget.");
            chunks.push(next.value);
          }
        } catch (error) {
          await reader.cancel().catch(() => undefined);
          throw error;
        }
      }
      const buffer = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let data: unknown;
      try {
        data = JSON.parse(new TextDecoder().decode(buffer));
      } catch {
        fail("invalid_output", "Source returned an invalid response.");
      }
      if (!response.ok) {
        const code =
          data && typeof data === "object" && "code" in data
            ? String(data.code)
            : "";
        if (response.status === 401)
          fail("unauthenticated", "Source authorization failed.");
        if (
          ["42P01", "42703", "42883", "42501"].includes(code) ||
          code.startsWith("PGRST")
        )
          fail("setup_error", "Source setup is unavailable.");
        fail("unavailable_source", "Source could not be retrieved.");
      }
      if (!auth) {
        const count = Array.isArray(data) ? data.length : data === null ? 0 : 1;
        stats.rows += count;
        if (stats.rows > TOOL_LIMITS.rows)
          fail("budget_exceeded", "Tool row budget exceeded.");
        const rangeTotal = response.headers.get("content-range")?.split("/")[1];
        if (
          paginated &&
          rangeTotal &&
          rangeTotal !== "*" &&
          count < Math.min(Number(rangeTotal), limit)
        )
          fail("partial", "Source truncated the requested retrieval window.");
        const totalProvesComplete =
          rangeTotal !== undefined &&
          /^\d+$/.test(rangeTotal) &&
          Number(rangeTotal) === count;
        if (
          !paginated &&
          rangeTotal &&
          rangeTotal !== "*" &&
          Number(rangeTotal) > count
        )
          fail("partial", "Source reports incomplete retrieval.");
        if (
          count > limit ||
          (!paginated &&
            (sentinel
              ? count > TOOL_LIMITS.rowsPerQuery
              : count >= limit && finiteBound > limit && !totalProvesComplete))
        )
          fail("partial", "Source exceeds the bounded retrieval window.");
        if (!safeMoney(data, moneySums))
          fail("invalid_output", "Source contains an unsafe money value.");
      }
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      if (error instanceof ToolFailure) throw error;
      if (options.signal.aborted) fail("timeout", "Tool retrieval timed out.");
      fail("unavailable_source", "Source could not be retrieved.");
    }
  };
  return {
    fetch: boundedFetch,
    stats,
    get failure() {
      return failure;
    },
  };
}
