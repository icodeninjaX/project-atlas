import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { signInAction } from "@/lib/auth/actions";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requestedNext = (await searchParams).next;
  const next = requestedNext
    ? safeRedirectPath(requestedNext, "/dashboard")
    : null;

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Continue your route."
      description="Log in to see today’s priorities and the numbers behind them."
      footer={
        <>
          New to Atlas?{" "}
          <Link
            href="/signup"
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
        hiddenFields={next ? { next } : undefined}
      />
      <Link
        href="/forgot-password"
        className="text-muted-foreground hover:text-foreground mt-4 block text-center text-xs"
      >
        Forgot your password?
      </Link>
    </AuthCard>
  );
}
