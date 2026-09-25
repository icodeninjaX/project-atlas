"use client";

import { BriefcaseBusiness, CheckCircle2, ReceiptText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SENTENCE =
  "Spent ₱420 on Grab to the Makati interview, applied to Canva as Product Designer, remind me to send my portfolio Friday 3pm";

const PROPOSALS = [
  {
    icon: ReceiptText,
    type: "Expense",
    title: "Grab · Transport",
    detail: "₱420.00 · today",
    phrase: "Spent ₱420 on Grab",
    revealAt: 42,
  },
  {
    icon: BriefcaseBusiness,
    type: "Career application",
    title: "Canva · Product Designer",
    detail: "Stage: Applied",
    phrase: "applied to Canva as Product Designer",
    revealAt: 86,
  },
  {
    icon: CheckCircle2,
    type: "Task",
    title: "Send my portfolio",
    detail: "Fri · 3:00 PM",
    phrase: "send my portfolio Friday 3pm",
    revealAt: SENTENCE.length,
  },
] as const;

export function CaptureDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(SENTENCE.length);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(entry?.isIntersecting ?? false),
      { threshold: 0.4 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    let position = 0;
    let hold = 0;
    const timer = window.setInterval(() => {
      if (position < SENTENCE.length) {
        position += 1;
        setTyped(position);
        return;
      }
      hold += 1;
      if (hold > 90) {
        position = 0;
        hold = 0;
        setTyped(0);
      }
    }, 38);
    return () => window.clearInterval(timer);
  }, [running]);

  const done = typed >= SENTENCE.length;

  return (
    <div ref={rootRef} className="landing-card landing-capture">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
        <p className="landing-mono text-[#aebcd0]">Universal Capture</p>
        <p className="landing-mono text-[#84afff]">
          {done ? "3 proposals" : "Reading…"}
        </p>
      </div>
      <div className="px-5 pt-5 pb-4">
        <p className="sr-only">Example capture: {SENTENCE}</p>
        <p
          aria-hidden="true"
          className="min-h-[4.5rem] text-[15px] leading-6 text-[#e8eef8]"
        >
          {SENTENCE.slice(0, typed)}
          <span className="landing-caret" data-done={done} />
        </p>
      </div>
      <ul className="grid gap-2 px-3 pb-3">
        {PROPOSALS.map((proposal) => {
          const Icon = proposal.icon;
          const visible = typed >= proposal.revealAt;
          return (
            <li
              key={proposal.type}
              className="landing-proposal"
              data-visible={visible}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#84afff]/10 text-[#84afff]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="landing-mono block text-[#8d99aa]">
                  {proposal.type}
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-[#f4f7fb]">
                  {proposal.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#aebcd0]">
                  from “{proposal.phrase}”
                </span>
              </span>
              <span className="shrink-0 text-right font-mono text-xs text-[#dfe7f5]">
                {proposal.detail}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3.5">
        <p className="text-xs text-[#aebcd0]">
          Nothing saves until you confirm.
        </p>
        <span className="rounded-full bg-[#84afff] px-3 py-1 text-xs font-semibold text-[#070a0f]">
          Confirm all
        </span>
      </div>
    </div>
  );
}
