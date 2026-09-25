"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicHeaderLink() {
  const onLogin = usePathname() === "/login";

  return (
    <Link
      href={onLogin ? "/signup" : "/login"}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      {onLogin ? "Create account" : "Log in"}
    </Link>
  );
}
