import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata = { title: "Set up your ATLAS" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 py-10 sm:p-8 lg:py-14">
      <p className="text-primary font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        Initial position
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
        Build your starting map.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
        Start with what is true today. You can add detailed debts after setup
        and change every optional answer later.
      </p>
      <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-7">
        <OnboardingForm />
      </div>
    </div>
  );
}
