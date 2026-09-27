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
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
            <CreditCard aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
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
      <div className="border-border mt-3 border-y">
        {available && (
          <dl className="py-3">
            <dt className="text-muted-foreground text-[11px] font-medium">
              Available balance
            </dt>
            <dd className="mt-1 min-w-0 font-mono text-[clamp(1.75rem,9vw,2.25rem)] leading-tight font-semibold tracking-[-0.04em] [overflow-wrap:anywhere] break-words sm:text-4xl">
              <SensitiveValue>{dashboardPeso(available.value)}</SensitiveValue>
            </dd>
            <dd className="text-muted-foreground mt-1 text-xs leading-4">
              Available across active accounts
            </dd>
          </dl>
        )}

        <dl className="border-border divide-border divide-y border-t">
          {supportingMetrics.map((metric) => (
            <div
              key={metric.label}
              className="grid min-w-0 gap-x-3 gap-y-1 py-3 min-[360px]:grid-cols-[minmax(0,1fr)_auto] min-[360px]:items-start"
            >
              <dt className="text-muted-foreground min-w-0 text-xs leading-5 break-words">
                {metric.label}
              </dt>
              <dd className="min-w-0 font-mono text-sm leading-5 font-semibold tracking-tight [overflow-wrap:anywhere] break-words min-[360px]:text-right">
                <SensitiveValue>{dashboardPeso(metric.value)}</SensitiveValue>
              </dd>
              <dd className="text-muted-foreground min-w-0 text-xs leading-4 break-words min-[360px]:col-span-2">
                <MetricNote metric={metric} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
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
