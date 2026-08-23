import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacyToggle } from "./privacy-toggle";
import { PrivacyProvider, SensitiveValue } from "./privacy-provider";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.atlasPrivacy;
});

describe("privacy mode", () => {
  it("masks sensitive values and persists the device preference", async () => {
    const user = userEvent.setup();
    render(
      <PrivacyProvider userId="user-1">
        <SensitiveValue>₱12,345.00</SensitiveValue>
        <PrivacyToggle showLabel />
      </PrivacyProvider>,
    );

    expect(screen.getByText("₱12,345.00")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Hide sensitive values" }),
    );
    expect(screen.queryByText("₱12,345.00")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Hidden sensitive value")).toHaveTextContent(
      "••••••",
    );
    expect(window.localStorage.getItem("atlas:privacy-mode:user-1")).toBe(
      "hidden",
    );
  });
});
