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
  it("reads the parent form status and shows the pending state", async () => {
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
    const spinner = container.querySelector("svg.animate-spin");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(spinner).toBeInTheDocument();

    await act(async () => resolveAction?.());
  });
});
