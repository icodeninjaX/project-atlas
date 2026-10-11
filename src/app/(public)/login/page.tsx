import type { Route } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { signInAction } from "@/lib/auth/actions";
import { pathWithNext, safeRedirectPath } from "@/lib/auth/redirects";

export const metadata = { title: "Log in" };

/** Why a redirect sent the visitor here, keyed by its query parameter. */
function noticeFor(params: { error?: string; setup?: string }) {
  if (params.error === "auth_callback_failed")
    return "That sign-in link has expired or was already used. Log in again or request a new link.";
  // The server has no sign-in service configured.
  if (params.setup === "required")
    return "Sign-in isn’t available right now. Try again later.";
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; setup?: string }>;
}) {
  const params = await searchParams;
  const requestedNext = params.next;
  const next = requestedNext
    ? safeRedirectPath(requestedNext, "/dashboard")
    : null;
  const notice = noticeFor(params);

  return (
    <AuthCard
      title="Log in to ATLAS"
      description="See today’s priorities and the numbers behind them."
      notice={
        notice && (
          <p role="alert" className="text-destructive mb-4 text-sm leading-5">
            {notice}
          </p>
        )
      }
      footer={
        <>
          New to ATLAS?{" "}
          <Link
            href={pathWithNext("/signup", next) as Route}
            className="text-primary font-medium hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm
        action={signInAction}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        hiddenFields={next ? { next } : undefined}
      />
      <Link
        href={pathWithNext("/forgot-password", next) as Route}
        className="text-muted-foreground hover:text-foreground mt-4 block text-center text-xs"
      >
        Forgot your password?
      </Link>
    </AuthCard>
  );
}
