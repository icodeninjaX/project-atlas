import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/env";

const protectedPagePrefixes = [
  "/dashboard",
  "/onboarding",
  "/career",
  "/reviews",
  "/settings",
  "/search",
  "/debts",
  "/money",
  "/goals",
  "/tasks",
];

const protectedApiPrefixes = ["/api/export", "/api/offline-sync"];

function matchesRoutePrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const config = getPublicSupabaseConfig();
  const isProtectedPage = matchesRoutePrefix(
    request.nextUrl.pathname,
    protectedPagePrefixes,
  );
  const isProtectedApi = matchesRoutePrefix(
    request.nextUrl.pathname,
    protectedApiPrefixes,
  );

  if (!config) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return isProtectedPage
      ? NextResponse.redirect(new URL("/login?setup=required", request.url))
      : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && isProtectedPage) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(login);
  }

  if (user && (isProtectedPage || isProtectedApi)) {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
      if (isProtectedApi) {
        return NextResponse.json({ error: "MFA required" }, { status: 403 });
      }
      const challenge = new URL("/mfa", request.url);
      challenge.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(challenge);
    }
  }

  if (user && ["/login", "/signup"].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
