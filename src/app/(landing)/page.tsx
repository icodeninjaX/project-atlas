import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Download,
  EyeOff,
  Fingerprint,
  GitBranch,
  LineChart,
  ShieldCheck,
  Sparkles,
  Split,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { CaptureDemo } from "@/components/landing/capture-demo";
import {
  CareerPanel,
  GoalsPanel,
  MoneyPanel,
  ReflectionPanel,
  TasksPanel,
} from "@/components/landing/domain-panels";
import { landingSerif } from "@/components/landing/landing-fonts";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingStage } from "@/components/landing/landing-stage";
import { ROUTE_STOPS } from "@/components/landing/scene-states";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "ATLAS — Your personal operating system" },
  description:
    "Money, debts, tasks, goals, career and weekly reflection working as one system — with one clear daily route. Private by design, built for real life in Philippine pesos.",
};

function step(index: number) {
  return { "--i": index } as CSSProperties;
}

function Serif({ children }: { children: ReactNode }) {
  return <em className="landing-serif">{children}</em>;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p data-reveal className="landing-mono landing-eyebrow">
      {children}
    </p>
  );
}

type DomainChapterProps = {
  id: string;
  index: number;
  name: string;
  title: ReactNode;
  body: string;
  points: string[];
  panel: ReactNode;
  reverse?: boolean;
};

function DomainChapter({
  id,
  index,
  name,
  title,
  body,
  points,
  panel,
  reverse = false,
}: DomainChapterProps) {
  return (
    <section
      id={id}
      data-chapter={id}
      data-reveal-group
      aria-labelledby={`${id}-title`}
      className="landing-chapter landing-chapter--domain"
    >
      <div className="landing-pin">
        <div
          className="landing-triptych landing-container"
          data-reverse={reverse}
        >
          <div className="landing-triptych-copy">
            <Eyebrow>
              <span className="text-[#84afff]">0{index}</span>
              <span className="landing-eyebrow-rule" />
              {name}
            </Eyebrow>
            <h2 id={`${id}-title`} data-reveal className="landing-h2">
              {title}
            </h2>
            <p data-reveal className="landing-body">
              {body}
            </p>
            <ul data-reveal className="landing-points">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="landing-triptych-object" aria-hidden="true" />
          <div data-reveal className="landing-triptych-panel">
            {panel}
          </div>
        </div>
      </div>
    </section>
  );
}

const intelligence = [
  {
    icon: Sparkles,
    title: "Grounded Analyst",
    body: "Ask across money, tasks, goals and reviews. Every claim cites the records behind it — no evidence, no answer.",
  },
  {
    icon: ArrowUpRight,
    title: "Next best action",
    body: "A due application follow-up becomes a proposed task on Today. Review it, then confirm or dismiss.",
  },
  {
    icon: GitBranch,
    title: "Patterns",
    body: "Monthly associations between income, spending, debt payments, tasks and review scores — shown only when they pass strict checks, never framed as cause.",
  },
  {
    icon: LineChart,
    title: "Scenarios",
    body: "What if income drops 20%, or you add ₱2,000 a month to a debt? Compare runway side by side before you move a peso.",
  },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "Isolated by account",
    body: "Row-level security scopes every record to its owner inside the database itself.",
  },
  {
    icon: Fingerprint,
    title: "Two-factor sign-in",
    body: "TOTP authenticator MFA, session controls and authenticated account deletion.",
  },
  {
    icon: EyeOff,
    title: "Privacy mode",
    body: "One tap blurs every amount on screen — for cafés, commutes and screen shares.",
    demo: true,
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "An installable app with user-scoped caches. Changes replay when you reconnect.",
  },
  {
    icon: Download,
    title: "Yours to take",
    body: "Export your records as CSV or JSON whenever you like.",
  },
  {
    icon: BellRing,
    title: "Quiet reminders",
    body: "Opt-in daily push reminders that respect your quiet hours.",
  },
];

const providers = [
  ["GCash", "/icons/gcash-official.png"],
  ["Maya", "/icons/ph-accounts/maya.png"],
  ["BPI", "/icons/ph-accounts/bpi.png"],
  ["BDO", "/icons/ph-accounts/bdo.png"],
  ["UnionBank", "/icons/ph-accounts/unionbank.png"],
  ["GoTyme", "/icons/ph-accounts/gotyme.png"],
  ["Metrobank", "/icons/ph-accounts/metrobank.png"],
  ["Tonik", "/icons/ph-accounts/tonik.png"],
] as const;

export default function LandingPage() {
  return (
    <div data-landing-root className={`dark landing ${landingSerif.variable}`}>
      <LandingStage />

      <header className="landing-header">
        <div className="landing-container flex h-16 items-center justify-between sm:h-18">
          <Link
            href="/"
            className="landing-focus flex items-center gap-3 rounded-xl"
          >
            <AtlasMark className="size-8" />
            <span className="text-sm font-semibold tracking-[0.18em] text-[#f4f7fb]">
              ATLAS
            </span>
          </Link>
          <nav
            aria-label="Account"
            className="flex items-center gap-1 sm:gap-2"
          >
            <Link
              href="/login"
              className="landing-focus rounded-full px-3.5 py-2 text-sm font-medium text-[#c9d3e3] transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="landing-button landing-button--small"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <LandingMotion />

      <main className="relative z-10">
        {/* Hero */}
        <section
          id="hero"
          data-chapter="hero"
          data-reveal-group
          data-inview="true"
          aria-labelledby="hero-title"
          className="landing-hero"
        >
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p
                className="landing-mono landing-eyebrow landing-intro"
                style={step(0)}
              >
                Your personal operating system
              </p>
              <h1 id="hero-title" className="landing-h1">
                <span className="landing-intro block" style={step(1)}>
                  See where you are.
                </span>
                <span className="landing-intro block" style={step(2)}>
                  <Serif>Choose what moves.</Serif>
                </span>
              </h1>
              <p className="landing-lede landing-intro" style={step(3)}>
                ATLAS brings your money, debts, tasks, goals, and career into
                one clear daily route—built for real life in Philippine pesos.
              </p>
              <div
                className="landing-intro mt-9 flex flex-wrap gap-3"
                style={step(4)}
              >
                <Link href="/signup" className="landing-button">
                  Start your ATLAS
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="landing-button landing-button--ghost"
                >
                  Open your dashboard
                </Link>
              </div>
              <p
                className="landing-intro mt-6 flex items-center gap-2 text-xs text-[#aebcd0]"
                style={step(5)}
              >
                <ShieldCheck
                  className="size-3.5 text-[#84afff]"
                  aria-hidden="true"
                />
                Private by design. Your records stay isolated by account.
              </p>
            </div>
          </div>
          <div className="landing-container landing-hero-foot">
            <p className="landing-mono flex items-center gap-3 text-[#aebcd0]">
              <span className="landing-scroll-cue" aria-hidden="true" />
              Scroll to take it apart
            </p>
            <p className="landing-mono hidden text-[#8d99aa] sm:block">
              14.5547° N · 121.0244° E — Asia/Manila
            </p>
          </div>
        </section>

        {/* Fracture */}
        <section
          id="fracture"
          data-chapter="fracture"
          data-reveal-group
          aria-labelledby="fracture-title"
          className="landing-chapter landing-chapter--fracture"
        >
          <div className="landing-pin">
            <div className="landing-container landing-fracture">
              <div className="landing-fracture-copy">
                <Eyebrow>The problem</Eyebrow>
                <h2 id="fracture-title" data-reveal className="landing-h2">
                  Your life is already a system.{" "}
                  <Serif>It just doesn’t know it.</Serif>
                </h2>
                <p data-reveal className="landing-body">
                  Your balance lives in a banking app. Deadlines live in your
                  head. The job hunt lives in a spreadsheet you stopped updating
                  in March. Every part works alone—so nothing tells you what
                  matters today.
                </p>
                <dl data-reveal className="landing-stats">
                  <div>
                    <dt>Systems</dt>
                    <dd>5</dd>
                  </div>
                  <div>
                    <dt>Daily route</dt>
                    <dd>1</dd>
                  </div>
                  <div>
                    <dt>Spreadsheets</dt>
                    <dd>0</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <DomainChapter
          id="money"
          index={1}
          name="Money & debts"
          title={
            <>
              Every centavo, <Serif>accounted for.</Serif>
            </>
          }
          body="Accounts, transactions, transfers and monthly budgets—stored as exact integer centavos, so balances never drift. Debts get a payoff strategy, amortization estimates and an atomic payment history."
          points={[
            "GCash, Maya, banks and cash in one ledger",
            "Avalanche or snowball debt strategies",
            "Runway: how long your money lasts",
          ]}
          panel={<MoneyPanel />}
        />
        <DomainChapter
          id="tasks"
          index={2}
          name="Tasks"
          reverse
          title={
            <>
              Know what’s next, <Serif>not just what’s due.</Serif>
            </>
          }
          body="Capture fast, schedule to the minute, and work from Today, Upcoming, Overdue and Inbox. Time recommendations suggest when things fit, and Focus mode clears everything else away."
          points={[
            "Exact-time scheduling and reminders",
            "Focus mode with completion feedback",
            "Keyboard-first capture",
          ]}
          panel={<TasksPanel />}
        />
        <DomainChapter
          id="goals"
          index={3}
          name="Goals"
          title={
            <>
              Goals that move <Serif>when you do.</Serif>
            </>
          }
          body="Progress is earned by milestones, not guessed with a slider. Rich milestone notes, category colours and related tasks keep the big picture tied to this week’s work."
          points={[
            "Milestone-driven progress",
            "Linked tasks, debts, applications and notes",
            "Category colours across the whole OS",
          ]}
          panel={<GoalsPanel />}
        />
        <DomainChapter
          id="career"
          index={4}
          name="Career"
          reverse
          title={
            <>
              A job search <Serif>with a memory.</Serif>
            </>
          }
          body="Table or Kanban, your call. Every application keeps its stage history, notes and follow-up date—and overdue follow-ups surface on Today before an opportunity goes cold."
          points={[
            "Customizable table and Kanban views",
            "Stage history for every application",
            "Overdue follow-ups flagged automatically",
          ]}
          panel={<CareerPanel />}
        />
        <DomainChapter
          id="reflection"
          index={5}
          name="Reflection"
          title={
            <>
              Sunday, <Serif>with receipts.</Serif>
            </>
          }
          body="Each Monday-to-Sunday week closes with a factual summary of what actually happened—then guided prompts help you decide what changes. Drafts save; scores trend over time."
          points={[
            "Factual weekly summaries",
            "Guided reflection with drafts",
            "Score trends week over week",
          ]}
          panel={<ReflectionPanel />}
        />

        {/* Intelligence */}
        <section
          id="intelligence"
          data-chapter="intelligence"
          data-reveal-group
          aria-labelledby="intelligence-title"
          className="landing-chapter landing-chapter--intelligence"
        >
          <div className="landing-intelligence-pin">
            <div className="landing-pin">
              <div className="landing-container landing-split">
                <div className="landing-split-copy">
                  <Eyebrow>
                    <span className="text-[#84afff]">06</span>
                    <span className="landing-eyebrow-rule" />
                    The open center
                  </Eyebrow>
                  <h2
                    id="intelligence-title"
                    data-reveal
                    className="landing-h2"
                  >
                    The open center is <Serif>where it thinks.</Serif>
                  </h2>
                  <p data-reveal className="landing-body">
                    Every piece of the core faces the same empty middle. That is
                    where ATLAS connects your records—carefully, with evidence,
                    and never without your say.
                  </p>
                  <div data-reveal className="mt-8">
                    <CaptureDemo />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-container pb-28 lg:pb-40">
            <ul data-reveal className="landing-capabilities">
              {intelligence.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="landing-card landing-capability"
                  >
                    <Icon
                      className="size-5 text-[#84afff]"
                      aria-hidden="true"
                    />
                    <h3 className="mt-6 text-base font-semibold text-[#f4f7fb]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#aebcd0]">
                      {item.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Dayline */}
        <section
          id="dayline"
          data-chapter="dayline"
          data-reveal-group
          aria-labelledby="dayline-title"
          className="landing-chapter landing-chapter--dayline"
        >
          <div className="landing-pin">
            <div className="landing-container landing-dayline">
              <div className="landing-dayline-top">
                <Eyebrow>
                  <span className="text-[#84afff]">07</span>
                  <span className="landing-eyebrow-rule" />
                  Alignment
                </Eyebrow>
                <h2 id="dayline-title" data-reveal className="landing-h2">
                  Five systems. <Serif>One route.</Serif>
                </h2>
              </div>
              <ol className="landing-route-list">
                {ROUTE_STOPS.map((stop) => (
                  <li key={stop.time}>
                    <span className="landing-route-label-time">
                      {stop.time}
                    </span>{" "}
                    <span className="landing-route-label-title">
                      {stop.title}
                    </span>
                    <span className="sr-only">: </span>{" "}
                    <span className="landing-route-label-note">
                      {stop.note}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="landing-dayline-bottom">
                <p data-reveal className="landing-body">
                  Today turns everything into the Dayline—an ordered route of
                  what to do now, next and later. Deterministic priorities you
                  can read, not a mystery score.
                </p>
                <div data-reveal className="landing-dayline-legend">
                  <Split className="size-4 text-[#84afff]" aria-hidden="true" />
                  <span>Now → Next → Later</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section
          id="trust"
          data-chapter="trust"
          data-reveal-group
          aria-labelledby="trust-title"
          className="landing-chapter landing-chapter--trust"
        >
          <div className="landing-container landing-trust">
            <div className="landing-trust-copy">
              <Eyebrow>
                <span className="text-[#84afff]">08</span>
                <span className="landing-eyebrow-rule" />
                Reassembled
              </Eyebrow>
              <h2 id="trust-title" data-reveal className="landing-h2">
                Private <Serif>by design.</Serif>
              </h2>
              <p data-reveal className="landing-body">
                A personal operating system only works if you trust it with
                everything. So the protections live in the foundations, not in a
                settings page.
              </p>
              <ul data-reveal className="landing-trust-grid">
                {trust.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.title}
                      className="landing-card landing-trust-item"
                    >
                      <Icon
                        className="size-4.5 text-[#84afff]"
                        aria-hidden="true"
                      />
                      <h3 className="mt-4 text-sm font-semibold text-[#f4f7fb]">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-5 text-[#aebcd0]">
                        {item.body}
                      </p>
                      {item.demo && (
                        <p className="landing-privacy-demo mt-3 font-mono text-sm text-[#f4f7fb]">
                          <span className="landing-privacy-amount">
                            ₱86,200.00
                          </span>
                          <span className="text-[11px] text-[#8d99aa]">
                            Hover to peek
                          </span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Philippines-first */}
        <section
          id="home"
          data-chapter="home"
          data-reveal-group
          aria-labelledby="home-title"
          className="landing-home"
        >
          <Image
            src="/landing/manila-blue-hour.webp"
            alt="Metro Manila skyline at blue hour"
            fill
            sizes="100vw"
            className="landing-home-image object-cover"
          />
          <div className="landing-home-shade" />
          <div className="landing-container relative py-28 lg:py-40">
            <Eyebrow>Philippines-first</Eyebrow>
            <h2 id="home-title" data-reveal className="landing-h2 max-w-3xl">
              Built for real life <Serif>in pesos.</Serif>
            </h2>
            <dl data-reveal className="landing-home-facts">
              <div>
                <dt>Currency</dt>
                <dd>₱ stored as exact integer centavos</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>Every date shown in Asia/Manila</dd>
              </div>
              <div>
                <dt>Week</dt>
                <dd>Monday to Sunday reviews</dd>
              </div>
              <div>
                <dt>Accounts</dt>
                <dd>20+ local banks and e-wallets</dd>
              </div>
            </dl>
            <ul
              data-reveal
              className="landing-providers"
              aria-label="Supported providers include"
            >
              {providers.map(([name, icon]) => (
                <li key={name}>
                  <Image
                    src={icon}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-md bg-white object-contain p-0.5"
                  />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Call to action */}
        <section
          id="cta"
          data-chapter="cta"
          data-reveal-group
          aria-labelledby="cta-title"
          className="landing-cta"
        >
          <video
            className="landing-cta-video"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="/landing/system-core-film-poster.webp"
            aria-hidden="true"
          >
            <source src="/landing/system-core-film.webm" type="video/webm" />
            <source src="/landing/system-core-film.mp4" type="video/mp4" />
          </video>
          <div className="landing-cta-shade" />
          <div className="landing-container relative flex min-h-[112svh] flex-col items-center justify-end pb-24 text-center sm:pb-32">
            <Eyebrow>One system</Eyebrow>
            <h2
              id="cta-title"
              data-reveal
              className="landing-h2 landing-h2--cta"
            >
              Put your life <Serif>back together.</Serif>
            </h2>
            <p data-reveal className="landing-body mx-auto max-w-xl">
              Start with one account and one task. ATLAS grows into the rest of
              your week as you do.
            </p>
            <div
              data-reveal
              className="mt-9 flex flex-wrap justify-center gap-3"
            >
              <Link href="/signup" className="landing-button">
                Create your ATLAS
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="landing-button landing-button--ghost"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer relative z-10">
        <div className="landing-container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AtlasMark className="size-7" />
            <p className="text-sm text-[#aebcd0]">
              <span className="font-semibold tracking-[0.18em] text-[#f4f7fb]">
                ATLAS
              </span>{" "}
              · Your personal operating system
            </p>
          </div>
          <p className="landing-mono text-[#8d99aa]">
            © 2026 · Made for the Philippines
          </p>
        </div>
      </footer>
    </div>
  );
}
