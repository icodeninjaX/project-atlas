import { Compass } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Set up your ATLAS" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeRedirectPath((await searchParams).next, "");

  return (
    <PageShell className="max-w-3xl">
      <PageHeading
        eyebrow="Initial position"
        icon={Compass}
        title="Build your starting map."
        description="Start with what is true today. You can add detailed debts after setup and change every optional answer later."
      />
      <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-7">
        <OnboardingForm next={next || null} />
      </div>
    </PageShell>
  );
}
