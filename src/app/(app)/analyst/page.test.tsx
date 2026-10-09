import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-00000000000a" } as { id: string } | null,
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/components/analyst/freeform-workspace", () => ({
  FreeformWorkspace: () => "legacy-workspace",
}));
vi.mock("@/components/analyst/intelligence-workspace", () => ({
  IntelligenceWorkspace: () => "intelligence-workspace",
}));
vi.mock("@/components/shared/page-heading", () => ({
  PageHeading: () => null,
  PageHeadingNote: () => null,
}));
// Any query chain resolves to no rows.
const rows = (): unknown =>
  new Proxy(() => undefined, {
    get: (_target, key) =>
      key === "then"
        ? (resolve: (value: unknown) => void) => resolve({ data: [] })
        : rows,
    apply: () => rows(),
  });
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: rows,
  }),
}));

import AnalystPage from "./page";

type Element = { type: unknown; props: { children?: unknown } };
function workspace(tree: unknown): string | null {
  if (!tree || typeof tree !== "object") return null;
  const element = tree as Element;
  if (typeof element.type === "function") {
    const name = (element.type as { name?: string }).name ?? "";
    if (/Workspace$/.test(name)) return name;
  }
  const children = ([] as unknown[]).concat(element.props?.children ?? []);
  for (const child of children) {
    const found = workspace(child);
    if (found) return found;
  }
  return null;
}

beforeEach(() => {
  state.user = { id: "00000000-0000-4000-8000-00000000000a" };
});
afterEach(() => {
  delete process.env.ATLAS_ANALYST_V2;
});

/**
 * Rollback check (AI-07): the server flag alone chooses the workspace, per
 * request, so turning it off restores the legacy Analyst without a deploy of
 * different code, and a signed-out visitor never sees the V2 workspace.
 */
describe("Analyst page flag", () => {
  it("shows the legacy workspace while the flag is off", async () => {
    expect(workspace(await AnalystPage())).toBe("FreeformWorkspace");
  });

  it("shows the V2 workspace to a signed-in user when the flag is on", async () => {
    process.env.ATLAS_ANALYST_V2 = "1";
    expect(workspace(await AnalystPage())).toBe("IntelligenceWorkspace");
  });

  it("keeps a signed-out visitor on the legacy workspace", async () => {
    process.env.ATLAS_ANALYST_V2 = "1";
    state.user = null;
    expect(workspace(await AnalystPage())).toBe("FreeformWorkspace");
  });
});
