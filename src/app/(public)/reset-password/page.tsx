import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const metadata = { title: "Choose new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeRedirectPath((await searchParams).next, "");

  return (
    <AuthCard
      eyebrow="Secure your account"
      title="Choose a new password."
      description="Open this page from the reset link in your email, then choose a new password."
    >
      <ResetPasswordForm destination={next || null} />
    </AuthCard>
  );
}
