import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryList, MemoryOffer, useMemories } from "./memory-panel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Panel() {
  const memory = useMemories(true);
  return (
    <>
      <MemoryOffer text="Saving for a laptop" onSave={memory.save} />
      <MemoryList
        memories={memory.memories}
        error={memory.error}
        onRemove={(id) => void memory.remove(id)}
      />
    </>
  );
}

describe("Analyst memory", () => {
  it("saves a priority only when the person confirms it, then lists and forgets it", async () => {
    const user = userEvent.setup();
    let saved: Array<{ id: string; text: string; daysLeft: number }> = [];
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (init?.method === "POST") {
          const { text } = JSON.parse(String(init.body)) as { text: string };
          saved = [{ id: "m1", text, daysLeft: 90 }];
          return Response.json({ memory: saved[0] }, { status: 201 });
        }
        if (init?.method === "DELETE") {
          saved = [];
          return new Response(null, { status: 204 });
        }
        return Response.json({ memories: saved });
      }),
    );
    render(<Panel />);
    await screen.findByText(/What Analyst remembers \(0\)/);
    // Nothing is saved while the offer is only shown.
    expect(calls).toEqual(["GET /api/analyst/memories"]);
    expect(
      screen.getAllByText(/sent to the AI provider with your questions/)[0],
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Remember" }));
    await screen.findByText(/Analyst will remember this/);
    expect(calls).toContain("POST /api/analyst/memories");
    await user.click(screen.getByText(/What Analyst remembers \(1\)/));
    expect(
      screen.getByText("Forgotten in 90 days unless it comes up again."),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Forget “Saving for a laptop”" }),
    );
    await waitFor(() =>
      expect(calls).toContain("DELETE /api/analyst/memories/m1"),
    );
    await screen.findByText(/What Analyst remembers \(0\)/);
  });

  it("shows why a priority could not be saved and lets the person dismiss it", async () => {
    const user = userEvent.setup();
    render(
      <MemoryOffer
        text="Saving for a laptop"
        onSave={async () => "Analyst keeps at most 10 priorities."}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remember" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "at most 10 priorities",
    );
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText("“Saving for a laptop”")).toBeNull();
  });
});
