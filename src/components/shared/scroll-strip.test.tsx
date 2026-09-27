import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollStrip } from "./scroll-strip";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom has no layout: give the strip 300px of room for 600px of tabs, each
// tab 80px wide, laid out 100px apart.
function stubLayout() {
  const isStrip = (el: Element) => el.getAttribute("aria-label") === "Views";
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(
    function (this: Element) {
      return isStrip(this) ? 600 : 80;
    },
  );
  vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(
    function (this: Element) {
      return isStrip(this) ? 300 : 80;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(80);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const index = Number(this.getAttribute("data-index") ?? -1);
      const left = index < 0 ? 0 : index * 100;
      return { left, right: left + 80, width: 80 } as DOMRect;
    },
  );
}

function renderStrip(active: number) {
  return render(
    <ScrollStrip aria-label="Views" activeKey={String(active)}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <a
          key={index}
          href={`#${index}`}
          data-index={index}
          aria-current={index === active ? "page" : undefined}
        >
          Tab {index}
        </a>
      ))}
    </ScrollStrip>,
  );
}

describe("ScrollStrip", () => {
  it("centers the current tab inside the strip", () => {
    stubLayout();
    renderStrip(5);

    const strip = screen.getByRole("navigation", { name: "Views" });
    expect(strip.scrollLeft).toBe(500 - (300 - 80) / 2);
  });

  it("fades the edges that have hidden tabs", () => {
    stubLayout();
    renderStrip(0);

    const strip = screen.getByRole("navigation", { name: "Views" });
    expect(strip).toHaveAttribute("data-fade", "end");

    strip.scrollLeft = 150;
    fireEvent.scroll(strip);
    expect(strip).toHaveAttribute("data-fade", "both");

    strip.scrollLeft = 300;
    fireEvent.scroll(strip);
    expect(strip).toHaveAttribute("data-fade", "start");
  });

  it("does not fade a strip that fits", () => {
    render(
      <ScrollStrip aria-label="Views">
        <a href="#a">One tab</a>
      </ScrollStrip>,
    );

    expect(
      screen.getByRole("navigation", { name: "Views" }),
    ).not.toHaveAttribute("data-fade");
  });
});
