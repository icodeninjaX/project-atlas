import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLaunchScreen } from "./brand-launch-screen";

describe("BrandLaunchScreen", () => {
  it("animates the ATLAS identity as a decorative overlay", () => {
    const { container } = render(<BrandLaunchScreen />);

    const overlay = container.querySelector(".atlas-launch-screen");
    const logo = container.querySelector("img");
    const wordmark = container.querySelector(".atlas-launch-wordmark");

    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(logo).toHaveAttribute("src", "/brand/atlas-system-core-launch.png");
    expect(logo).toHaveAttribute("alt", "");
    expect(wordmark).toHaveTextContent("ATLAS");
    expect(
      container.querySelectorAll(".atlas-launch-wordmark-letter"),
    ).toHaveLength(5);
  });
});
