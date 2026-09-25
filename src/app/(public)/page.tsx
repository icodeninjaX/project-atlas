import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Goal,
  Landmark,
  MapPin,
  NotebookPen,
  ShieldCheck,
  WalletCards,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { AtlasMark } from "@/components/atlas/atlas-mark";
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

const modules = [
  {
    icon: WalletCards,
    title: "Money",
    body: "Accounts, income, expenses, transfers, and monthly budgets, recorded to the centavo.",
  },
  {
    icon: Landmark,
    title: "Debts",
    body: "Payment history, payoff strategies, and amortization estimates you can trace.",
  },
  {
    icon: ClipboardCheck,
    title: "Tasks",
    body: "Today, upcoming, and overdue views with exact-time scheduling and a focus mode.",
  },
  {
    icon: Goal,
    title: "Goals",
    body: "Outcomes with milestones that move progress, and the tasks that serve them.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Career",
    body: "Applications on a table or board, with stage history and follow-up dates.",
  },
  {
    icon: NotebookPen,
    title: "Weekly review",
    body: "Monday-to-Sunday facts beside a guided reflection, with trends over time.",
  },
];

const principles = [
  {
    icon: MapPin,
    title: "Made for the Philippines",
    body: "Pesos are stored as whole centavos and every date is shown in Manila time.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Records are isolated by account, and privacy mode hides amounts on shared screens.",
  },
  {
    icon: WifiOff,
    title: "Works when you are offline",
    body: "Install it like an app. Changes made offline sync when you reconnect.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="atlas-grid pointer-events-none absolute inset-0 opacity-65" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pt-14 pb-18 sm:px-8 sm:pt-24 lg:pb-28 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:gap-16">
          <div className="max-w-2xl">
            <p className="text-primary mb-5 text-xs font-semibold tracking-[0.14em] uppercase">
              Your personal operating system
            </p>
            <h1 className="text-5xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-7xl xl:text-[4.25rem] 2xl:text-7xl">
              <span className="block text-balance xl:whitespace-nowrap">
                See where you are.
              </span>
              <span className="text-muted-foreground block text-balance xl:whitespace-nowrap">
                Choose what moves.
              </span>
            </h1>
            <p className="text-muted-foreground mt-7 max-w-lg text-base leading-7 text-pretty sm:text-lg">
              ATLAS brings your money, debts, tasks, goals, and career into one
              clear daily route—built for real life in Philippine pesos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start your ATLAS
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
                <div className="border-primary/25 bg-primary/10 text-primary rounded-full border px-3 py-1 text-[11px] font-semibold">
                  3 priorities
                </div>
              </div>
              <div className="bg-border grid gap-px sm:grid-cols-[1.3fr_0.7fr]">
                <div className="bg-card flex flex-col p-5 sm:p-6">
                  <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-[0.12em] uppercase">
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
                  <div className="border-border mt-6 border-t pt-4 sm:mt-auto">
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>Planned today</span>
                      <span className="text-foreground font-mono font-medium">
                        70 of 180 min
                      </span>
                    </div>
                    <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                      <div className="bg-primary h-full w-[39%] rounded-full" />
                    </div>
                  </div>
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
                  <div className="bg-card col-span-2 p-5 sm:col-span-1">
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

      <section
        aria-labelledby="modules-title"
        className="border-border border-t"
      >
        <div className="mx-auto max-w-7xl px-5 py-18 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
              One daily route
            </p>
            <h2
              id="modules-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl"
            >
              Six parts of your life, read as one system.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-7 text-pretty">
              Each area keeps its own detail. The Today view ranks what matters
              across all of them, so you start with one clear move.
            </p>
          </div>
          <ul className="border-border bg-border mt-12 grid gap-px overflow-hidden rounded-3xl border sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, body }) => (
              <li key={title} className="bg-card p-6 sm:p-7">
                <span className="border-primary/20 bg-primary/10 text-primary grid size-10 place-items-center rounded-xl border">
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="principles-title"
        className="border-border bg-sidebar border-y"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-18 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
              Built for real life
            </p>
            <h2
              id="principles-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl"
            >
              Calm, precise, and yours alone.
            </h2>
          </div>
          <ul className="grid gap-8 sm:grid-cols-3 lg:gap-10">
            {principles.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon aria-hidden="true" className="text-primary size-5" />
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="closing-title" className="relative">
        <div className="mx-auto max-w-7xl px-5 py-18 text-center sm:px-8 sm:py-24">
          <h2
            id="closing-title"
            className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl"
          >
            Know where you stand by tomorrow morning.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base leading-7">
            Add an account and a few tasks tonight. ATLAS will have your first
            route ready when you open it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create your account
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <AtlasMark className="size-7" />
            <span>
              <span className="text-foreground font-semibold">ATLAS</span> ·
              Your personal operating system
            </span>
          </div>
          <p>© {new Date().getFullYear()} ATLAS</p>
        </div>
      </footer>
    </main>
  );
}
