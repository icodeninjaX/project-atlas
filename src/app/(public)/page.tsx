import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Goal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const route = [
  {
    label: "Now",
    title: "Send portfolio follow-up",
    note: "Career action overdue by 1 day",
  },
  {
    label: "Next",
    title: "Pay Maya Credit",
    note: "Due in 2 days · ₱1,250.00",
  },
  {
    label: "Later",
    title: "Ship client landing page",
    note: "Goal milestone · Friday",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="atlas-grid pointer-events-none absolute inset-0 opacity-65" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pt-14 pb-18 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-28">
          <div className="max-w-xl">
            <p className="text-primary mb-5 font-mono text-xs font-semibold tracking-[0.22em] uppercase">
              Your personal operating system
            </p>
            <h1 className="text-5xl leading-[0.98] font-semibold tracking-[-0.055em] text-balance sm:text-7xl">
              See where you are.
              <span className="text-muted-foreground block">
                Choose what moves.
              </span>
            </h1>
            <p className="text-muted-foreground mt-7 max-w-lg text-base leading-7 text-pretty sm:text-lg">
              Atlas brings your money, debts, tasks, goals, and career into one
              clear daily route—built for real life in Philippine pesos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start your Atlas
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Open your dashboard</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-5 flex items-center gap-2 text-xs">
              <Check className="text-primary size-3.5" />
              Private by design. Your records stay isolated by account.
            </p>
          </div>

          <div className="relative">
            <div className="bg-primary/10 absolute -inset-10 -z-10 rounded-full blur-3xl" />
            <div className="border-border bg-card overflow-hidden rounded-[28px] border shadow-2xl shadow-black/20">
              <div className="border-border flex items-center justify-between border-b px-5 py-4">
                <div>
                  <p className="text-muted-foreground text-xs">Sunday route</p>
                  <p className="mt-0.5 text-sm font-semibold">July 26, 2026</p>
                </div>
                <div className="border-primary/25 bg-primary/10 text-primary rounded-full border px-3 py-1 font-mono text-[10px] font-semibold">
                  3 priorities
                </div>
              </div>
              <div className="bg-border grid gap-px sm:grid-cols-[1.3fr_0.7fr]">
                <div className="bg-card p-5 sm:p-6">
                  <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-wider uppercase">
                    Dayline
                  </p>
                  <ol className="space-y-0">
                    {route.map((item, index) => (
                      <li
                        key={item.label}
                        className="relative grid grid-cols-[22px_1fr] gap-3 pb-6 last:pb-0"
                      >
                        {index < route.length - 1 && (
                          <span className="bg-border absolute top-3 bottom-0 left-[6px] w-px" />
                        )}
                        <span
                          className={`relative mt-1 size-[13px] rounded-full border-2 ${
                            index === 0
                              ? "border-primary bg-primary ring-primary/15 ring-4"
                              : "border-muted-foreground bg-card"
                          }`}
                        />
                        <div>
                          <p className="text-primary font-mono text-[10px] font-semibold tracking-wider uppercase">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {item.title}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {item.note}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="bg-border grid grid-cols-2 gap-px sm:grid-cols-1">
                  <div className="bg-card p-5">
                    <CircleDollarSign className="text-primary size-4" />
                    <p className="mt-5 font-mono text-2xl font-semibold">
                      ₱4,300
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Available now
                    </p>
                  </div>
                  <div className="bg-card p-5">
                    <BriefcaseBusiness className="text-primary size-4" />
                    <p className="mt-5 font-mono text-2xl font-semibold">4</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Active applications
                    </p>
                  </div>
                  <div className="bg-card p-5">
                    <Goal className="text-primary size-4" />
                    <p className="mt-5 font-mono text-2xl font-semibold">63%</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Portfolio goal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
