import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "@/lib/auth/actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard
      eyebrow="Create your Atlas"
      title="Start with what is true."
      description="Set up a private workspace, then map your cash, debts, and next priorities."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <AuthForm action={signUpAction} submitLabel="Create account" />
    </AuthCard>
  );
}
