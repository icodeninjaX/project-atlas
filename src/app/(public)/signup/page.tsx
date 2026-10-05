import type { Route } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "@/lib/auth/actions";
import { pathWithNext, safeRedirectPath } from "@/lib/auth/redirects";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeRedirectPath((await searchParams).next, "");

  return (
    <AuthCard
      eyebrow="Create your ATLAS"
      title="Start with what is true."
      description="Set up a private workspace, then map your cash, debts, and next priorities."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={pathWithNext("/login", next) as Route}
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        hiddenFields={next ? { next } : undefined}
      />
    </AuthCard>
  );
}
