import { ArrowRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";

export type FinancialMetric = {
  label: string;
  value: string;
  note: string;
  sensitiveNote?: boolean;
};

function dashboardPeso(value: string): string {
  return value.replace(/\.00(?=\s|$)/g, "");
}

function MetricNote({ metric }: { metric: FinancialMetric }) {
  const note = dashboardPeso(metric.note);

  return metric.sensitiveNote ? <SensitiveValue>{note}</SensitiveValue> : note;
}

export function FinancialOverview({ metrics }: { metrics: FinancialMetric[] }) {
  const available =
    metrics.find(({ label }) => label.toLowerCase() === "available") ??
    metrics[0];
  const supportingMetrics = metrics
    .filter((metric) => metric !== available)
    .sort((left, right) => {
      const priority = ["expenses", "debt remaining", "income"];
      const rank = (label: string) => {
        const index = priority.indexOf(label.toLowerCase());
        return index === -1 ? priority.length : index;
      };
      return rank(left.label) - rank(right.label);
    });

  return (
    <section aria-labelledby="financial-snapshot" className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-xl">
            <CreditCard aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 id="financial-snapshot" className="text-sm font-semibold">
              Financial position
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Where your money stands now
            </p>
          </div>
        </div>
        <Link
          href="/money/accounts"
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Money <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>
      <dl className="border-border mt-3 border-y">
        {available && (
          <div className="py-3">
            <dt className="text-muted-foreground text-[11px] font-medium">
              Available balance
            </dt>
            <dd className="mt-1 font-mono text-[2rem] leading-9 font-semibold tracking-[-0.04em] sm:text-4xl">
              <SensitiveValue>{dashboardPeso(available.value)}</SensitiveValue>
            </dd>
            <dd className="text-muted-foreground mt-1 text-xs leading-4">
              Available across active accounts
            </dd>
          </div>
        )}

        <div className="border-border divide-border divide-y border-t">
          {supportingMetrics.map((metric) => (
            <div
              key={metric.label}
              className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5"
            >
              <dt className="text-muted-foreground min-w-0 truncate text-xs">
                {metric.label}
              </dt>
              <dd className="font-mono text-sm font-semibold tracking-tight">
                <SensitiveValue>{dashboardPeso(metric.value)}</SensitiveValue>
              </dd>
              <dd className="text-muted-foreground col-span-2 truncate text-[10px] leading-4">
                <MetricNote metric={metric} />
              </dd>
            </div>
          ))}
        </div>
      </dl>
      <div className="mt-1 flex justify-end">
        <Link
          href="/money/runway"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          View runway <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>
    </section>
  );
}
