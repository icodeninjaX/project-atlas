import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "@/lib/auth/actions";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Find your way back."
      description="Enter your email. If an ATLAS account exists, we will send a secure reset link."
    >
      <AuthForm
        action={forgotPasswordAction}
        submitLabel="Send reset link"
        includePassword={false}
      />
    </AuthCard>
  );
}
