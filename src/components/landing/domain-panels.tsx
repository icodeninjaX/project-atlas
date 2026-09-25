import Image from "next/image";
import { Check, Keyboard, Link2, Timer } from "lucide-react";
import type { CSSProperties } from "react";

function Meter({
  value,
  tone = "#84afff",
  label,
}: {
  value: number;
  tone?: string;
  label: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className="landing-meter"
      style={{ "--value": `${value}%`, "--tone": tone } as CSSProperties}
    >
      <span />
    </span>
  );
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
      <p className="landing-mono text-[#aebcd0]">{title}</p>
      <p className="landing-mono text-[#84afff]">{meta}</p>
    </div>
  );
}

const accounts = [
  { name: "GCash", icon: "/icons/gcash-official.png", balance: "12,480.50" },
  {
    name: "BPI Savings",
    icon: "/icons/ph-accounts/bpi.png",
    balance: "86,200.00",
  },
  { name: "Maya", icon: "/icons/ph-accounts/maya.png", balance: "3,105.25" },
];

const budgets = [
  { name: "Food", spent: "6,420", limit: "8,000", value: 80 },
  { name: "Transport", spent: "2,180", limit: "3,000", value: 73 },
  { name: "Bills", spent: "5,900", limit: "6,000", value: 98 },
];

export function MoneyPanel() {
  return (
    <div className="landing-card">
      <PanelHeader title="Accounts" meta="₱101,785.75" />
      <ul className="divide-y divide-white/[0.06] px-5">
        {accounts.map((account) => (
          <li key={account.name} className="flex items-center gap-3 py-3">
            <Image
              src={account.icon}
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-lg bg-white object-contain p-0.5"
            />
            <span className="flex-1 text-sm text-[#e8eef8]">
              {account.name}
            </span>
            <span className="landing-amount font-mono text-sm text-[#f4f7fb]">
              ₱{account.balance}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/[0.07] px-5 py-4">
        <p className="landing-mono mb-3 text-[#8d99aa]">September budget</p>
        <ul className="grid gap-3">
          {budgets.map((budget) => (
            <li key={budget.name} className="grid gap-1.5">
              <span className="flex justify-between text-xs">
                <span className="text-[#dfe7f5]">{budget.name}</span>
                <span className="font-mono text-[#aebcd0]">
                  ₱{budget.spent} / ₱{budget.limit}
                </span>
              </span>
              <Meter
                value={budget.value}
                tone={budget.value > 95 ? "#f0b35b" : "#84afff"}
                label={`${budget.name} budget ${budget.value}% used`}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.07]">
        <div className="bg-[#0b1019] px-5 py-4">
          <p className="landing-mono text-[#8d99aa]">Debt strategy</p>
          <p className="mt-1.5 text-sm font-semibold text-[#f4f7fb]">
            Avalanche
          </p>
          <p className="mt-0.5 text-xs text-[#aebcd0]">Maya Credit first</p>
        </div>
        <div className="bg-[#0b1019] px-5 py-4">
          <p className="landing-mono text-[#8d99aa]">Runway</p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-[#f4f7fb]">
            7.4 months
          </p>
          <p className="mt-0.5 text-xs text-[#aebcd0]">at current spend</p>
        </div>
      </div>
    </div>
  );
}

const tasks = [
  {
    time: "09:00",
    title: "Client landing page — hero",
    tag: "High",
    done: false,
  },
  {
    time: "11:30",
    title: "Reconcile GCash transactions",
    tag: "Money",
    done: true,
  },
  {
    time: "Overdue",
    title: "Send portfolio follow-up",
    tag: "Career",
    done: false,
    late: true,
  },
  { time: "17:00", title: "Gym · upper body", tag: "Health", done: false },
];

export function TasksPanel() {
  return (
    <div className="landing-card">
      <div className="flex gap-1 border-b border-white/[0.07] px-3 py-2.5">
        {["Today", "Upcoming", "Overdue", "Inbox"].map((tab, index) => (
          <span
            key={tab}
            className={`rounded-lg px-2.5 py-1 text-xs ${
              index === 0
                ? "bg-white/[0.08] font-semibold text-[#f4f7fb]"
                : "text-[#8d99aa]"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <ul className="px-5 py-2">
        {tasks.map((task) => (
          <li key={task.title} className="flex items-center gap-3 py-2.5">
            <span
              className={`grid size-4.5 shrink-0 place-items-center rounded-full border ${
                task.done
                  ? "border-[#84afff] bg-[#84afff] text-[#070a0f]"
                  : "border-white/25"
              }`}
            >
              {task.done && <Check className="size-3" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-sm ${
                  task.done ? "text-[#8d99aa] line-through" : "text-[#e8eef8]"
                }`}
              >
                {task.title}
              </span>
            </span>
            <span
              className={`shrink-0 font-mono text-[11px] ${
                task.late ? "text-[#ff8a96]" : "text-[#aebcd0]"
              }`}
            >
              {task.time}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-4 border-t border-white/[0.07] px-5 py-4">
        <span className="landing-focus-ring" aria-hidden="true">
          <Timer className="size-4 text-[#84afff]" />
        </span>
        <span className="flex-1">
          <span className="landing-mono block text-[#8d99aa]">Focus mode</span>
          <span className="mt-0.5 block text-sm font-semibold text-[#f4f7fb]">
            Client landing page — hero
          </span>
        </span>
        <span className="font-mono text-lg text-[#f4f7fb]">24:13</span>
      </div>
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-5 py-3 text-xs text-[#aebcd0]">
        <Keyboard className="size-3.5" aria-hidden="true" />
        Press <kbd className="landing-kbd">N</kbd> on Tasks to add one instantly
      </div>
    </div>
  );
}

const milestones = [
  { title: "Audit old case studies", done: true },
  { title: "Rewrite the Canva case study", done: true },
  { title: "Record a 3-minute walkthrough", done: false },
  { title: "Publish and share", done: false },
];

export function GoalsPanel() {
  return (
    <div className="landing-card">
      <PanelHeader title="Goal · Career" meta="Due Oct 31" />
      <div className="px-5 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[#f4f7fb]">Portfolio v2</p>
            <p className="mt-1 text-xs text-[#aebcd0]">
              Progress moves with milestones
            </p>
          </div>
          <p className="font-mono text-3xl font-semibold text-[#f4f7fb]">63%</p>
        </div>
        <div className="mt-4">
          <Meter
            value={63}
            tone="#b69cff"
            label="Portfolio v2 is 63% complete"
          />
        </div>
      </div>
      <ul className="grid gap-1 px-5 py-4">
        {milestones.map((milestone) => (
          <li key={milestone.title} className="flex items-center gap-3 py-1.5">
            <span
              className={`grid size-4.5 shrink-0 place-items-center rounded-md border ${
                milestone.done
                  ? "border-[#b69cff] bg-[#b69cff] text-[#070a0f]"
                  : "border-white/25"
              }`}
            >
              {milestone.done && (
                <Check className="size-3" aria-hidden="true" />
              )}
            </span>
            <span
              className={`text-sm ${
                milestone.done ? "text-[#8d99aa]" : "text-[#e8eef8]"
              }`}
            >
              {milestone.title}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-white/[0.07] px-5 py-4">
        {["4 related tasks", "1 application", "1 knowledge note"].map(
          (link) => (
            <span key={link} className="landing-chip">
              <Link2 className="size-3" aria-hidden="true" />
              {link}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

const columns = [
  {
    stage: "Applied",
    tone: "#84afff",
    cards: [
      { company: "Canva", role: "Product Designer", flag: "Follow up today" },
      { company: "Thinking Machines", role: "UX Engineer" },
    ],
  },
  {
    stage: "Interview",
    tone: "#62d6c4",
    cards: [{ company: "GCash", role: "Design Systems Lead" }],
  },
  {
    stage: "Final interview",
    tone: "#f0b35b",
    cards: [{ company: "Xendit", role: "Senior Designer" }],
  },
];

export function CareerPanel() {
  return (
    <div className="landing-card">
      <PanelHeader title="Applications" meta="4 active" />
      <div className="grid grid-cols-3 gap-2 p-3">
        {columns.map((column) => (
          <div
            key={column.stage}
            className="min-w-0 rounded-2xl bg-white/[0.03] p-2"
          >
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-[#dfe7f5]">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: column.tone }}
              />
              <span className="truncate">{column.stage}</span>
            </p>
            <ul className="grid gap-2">
              {column.cards.map((card) => (
                <li
                  key={card.company}
                  className="rounded-xl border border-white/[0.07] bg-[#0d131e] p-2.5"
                >
                  <p className="truncate text-xs font-semibold text-[#f4f7fb]">
                    {card.company}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#aebcd0]">
                    {card.role}
                  </p>
                  {"flag" in card && card.flag && (
                    <p className="mt-2 truncate rounded-md bg-[#ff8a96]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb3bb]">
                      {card.flag}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.07] px-5 py-4">
        <p className="landing-mono mb-2 text-[#8d99aa]">
          Stage history · GCash
        </p>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#dfe7f5]">
          <li>Interested · Sep 3</li>
          <li aria-hidden="true" className="text-[#8d99aa]">
            →
          </li>
          <li>Applied · Sep 12</li>
          <li aria-hidden="true" className="text-[#8d99aa]">
            →
          </li>
          <li className="text-[#62d6c4]">Interview · Sep 19</li>
        </ol>
      </div>
    </div>
  );
}

const reviewScores = [5, 6, 5, 7, 6, 7, 8, 8];

export function ReflectionPanel() {
  const width = 240;
  const height = 64;
  const points = reviewScores
    .map((score, index) => {
      const x = (index / (reviewScores.length - 1)) * width;
      const y = height - ((score - 3) / 7) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="landing-card">
      <PanelHeader title="Weekly review" meta="Sep 22 – 28" />
      <dl className="grid grid-cols-2 gap-px bg-white/[0.07]">
        {[
          ["Tasks completed", "23"],
          ["Spent", "₱14,210"],
          ["Paid to debt", "₱3,750"],
          ["Milestones", "2"],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#0b1019] px-5 py-3.5">
            <dt className="landing-mono text-[#8d99aa]">{label}</dt>
            <dd className="landing-amount mt-1 font-mono text-lg font-semibold text-[#f4f7fb]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-white/[0.07] px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="landing-mono text-[#8d99aa]">Score trend · 8 weeks</p>
          <p className="font-mono text-sm font-semibold text-[#f4f7fb]">
            8 / 10
          </p>
        </div>
        <svg
          viewBox={`-4 -6 ${width + 8} ${height + 12}`}
          className="mt-3 h-16 w-full"
          role="img"
          aria-label="Weekly review scores rising from 5 to 8 over eight weeks"
          preserveAspectRatio="none"
        >
          <polyline
            points={points}
            pathLength={1}
            fill="none"
            stroke="#84afff"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="landing-sparkline"
          />
        </svg>
      </div>
      <div className="border-t border-white/[0.07] px-5 py-4">
        <p className="text-xs font-semibold text-[#84afff]">
          What moved this week?
        </p>
        <p className="mt-1.5 text-sm leading-6 text-[#dfe7f5]">
          Shipped the hero, paid Maya early, and finally sent Canva my
          portfolio.
        </p>
      </div>
    </div>
  );
}
