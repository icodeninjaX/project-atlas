import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Choose new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      eyebrow="Secure your account"
      title="Choose a new password."
      description="Open this page from the reset link in your email, then choose a new password."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
