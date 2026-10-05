"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { pathWithNext } from "@/lib/auth/redirects";

function HeaderLink({ next }: { next: string | null }) {
  const onLogin = usePathname() === "/login";

  return (
    <Link
      href={pathWithNext(onLogin ? "/signup" : "/login", next) as Route}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      {onLogin ? "Create account" : "Log in"}
    </Link>
  );
}

function HeaderLinkWithNext() {
  // Switching between login and sign-up keeps the page the user asked for.
  return <HeaderLink next={useSearchParams().get("next")} />;
}

export function PublicHeaderLink() {
  return (
    <Suspense fallback={<HeaderLink next={null} />}>
      <HeaderLinkWithNext />
    </Suspense>
  );
}
