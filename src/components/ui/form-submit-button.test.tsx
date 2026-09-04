import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormSubmitButton } from "./form-submit-button";

afterEach(cleanup);

describe("FormSubmitButton", () => {
  it("reads the parent form status and shows the branded pending state", async () => {
    let resolveAction: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { container } = render(
      <form action={action}>
        <FormSubmitButton pendingLabel="Saving…">Save</FormSubmitButton>
      </form>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    const button = screen.getByRole("button", { name: "Saving…" });
    const logo = container.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");

    await act(async () => resolveAction?.());
  });
});
