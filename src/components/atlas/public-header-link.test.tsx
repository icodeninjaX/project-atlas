import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicHeaderLink } from "./public-header-link";

const pathname = vi.hoisted(() => ({ current: "/" }));
const search = vi.hoisted(() => ({ current: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(search.current),
}));

afterEach(() => {
  cleanup();
  search.current = "";
});

describe("PublicHeaderLink", () => {
  it("offers account creation instead of a redundant login link on /login", () => {
    pathname.current = "/login";
    render(<PublicHeaderLink />);
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/signup");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("links to login everywhere else", () => {
    pathname.current = "/signup";
    render(<PublicHeaderLink />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("keeps a safe destination when switching between login and sign-up", () => {
    pathname.current = "/signup";
    search.current = "next=%2Ftasks%3Fview%3Doverdue";
    render(<PublicHeaderLink />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?next=%2Ftasks%3Fview%3Doverdue",
    );
  });

  it("drops an unsafe destination", () => {
    pathname.current = "/login";
    search.current = "next=https%3A%2F%2Fattacker.invalid";
    render(<PublicHeaderLink />);
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/signup");
  });
});
