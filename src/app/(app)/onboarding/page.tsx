import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Set up ATLAS" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeRedirectPath((await searchParams).next, "");

  return (
    <PageShell className="max-w-3xl">
      <PageHeading
        title="Set up ATLAS"
        description="Add your starting cash, income, and goals. You can add debts after setup and change any optional answer later."
      />
      <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-6">
        <OnboardingForm next={next || null} />
      </div>
    </PageShell>
  );
}
