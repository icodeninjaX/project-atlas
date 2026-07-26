import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/env";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/health",
];

export async function proxy(request: NextRequest) {
  const config = getPublicSupabaseConfig();
  const isPublic = publicRoutes.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (!config) {
    return isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login?setup=required", request.url));
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

  if (!user && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(login);
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
