import { Landmark, ReceiptText, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
} from "@/components/dashboard/dashboard-card";
import { AccountLogo } from "@/components/money/account-visuals";
import { CategoryBadge } from "@/components/money/category-icon";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import { accountTypeDetails } from "@/lib/money/account-types";
import type {
  EssentialShare,
  RunwayAccount,
  RunwayAnalysis,
} from "@/lib/runway/engine";
import { baselineDescription, formatMonthCount } from "@/lib/runway/view";
import { cn } from "@/lib/utils";

/** Fixed so a color always means the same part of the need. */
const ESSENTIALS_COLOR = "var(--money-series-1)";
const DEBTS_COLOR = "var(--money-series-2)";

const list = new Intl.ListFormat("en", { type: "conjunction" });

function formatShare(share: number) {
  if (share > 0 && share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

function ShareRow({
  icon,
  name,
  detail,
  amount,
  note,
  share,
  color,
  muted = false,
}: {
  icon: ReactNode;
  name: string;
  detail?: ReactNode;
  amount: ReactNode;
  /** Under the amount: a share, or months of need. */
  note?: ReactNode;
  /** Fills the bar; null for no bar. */
  share: number | null;
  color: string;
  muted?: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b py-2.5 last:border-b-0">
      {/* Only the mark dims for a muted row; its text keeps full contrast. */}
      <span className={cn(muted && "opacity-55 grayscale")}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold break-words">{name}</p>
        {detail ? (
          <p className="text-muted-foreground text-xs leading-4">{detail}</p>
        ) : null}
        {share !== null ? (
          // The figures beside it say the same; the bar is for scanning.
          <div
            aria-hidden="true"
            className="bg-foreground/[0.06] mt-1.5 h-1 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(Math.max(share, 0), 1) * 100}%`,
                background: color,
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <p
          className={cn(
            "font-mono text-sm font-semibold [overflow-wrap:anywhere]",
            muted && "text-muted-foreground",
          )}
        >
          {amount}
        </p>
        {note ? (
          <p className="text-muted-foreground font-mono text-xs">{note}</p>
        ) : null}
      </div>
    </li>
  );
}

function CardTotal({
  centavos,
  unit,
  children,
}: {
  centavos: number;
  unit?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-5">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <MoneyAmount
          centavos={centavos}
          quietCentavos
          className="font-mono text-[1.75rem] leading-none font-semibold tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-[2rem]"
        />
        {unit ? (
          <span className="text-muted-foreground text-sm">{unit}</span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

/** Where the monthly need goes: each essential, then each debt minimum. */
export function MonthlyNeedCard({
  analysis,
  essentials,
}: {
  analysis: RunwayAnalysis;
  essentials: EssentialShare[];
}) {
  const need = analysis.monthlyNeedCentavos;
  const shareOf = (centavos: number) => (need > 0 ? centavos / need : 0);
  const recorded = essentials.filter((item) => item.monthlyCentavos > 0);
  const quiet = essentials
    .filter((item) => item.monthlyCentavos === 0)
    .map((item) => item.category.name);
  const debtShare = shareOf(analysis.monthlyDebtMinimumsCentavos);

  return (
    <section
      aria-labelledby="runway-need"
      data-spotlight
      className={dashboardCardClass}
    >
      <DashboardCardHeading
        id="runway-need"
        icon={ReceiptText}
        title="Monthly need"
        description={baselineDescription(analysis)}
      />
      <CardTotal centavos={need} unit="a month">
        {analysis.monthlyDebtMinimumsCentavos > 0 ? (
          <>
            <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5">
              <span
                className="block min-w-1.5 rounded-l-full"
                style={{
                  flex: `${1 - debtShare} 1 0%`,
                  background: ESSENTIALS_COLOR,
                }}
              />
              <span
                className="block min-w-1.5 rounded-r-full"
                style={{ flex: `${debtShare} 1 0%`, background: DEBTS_COLOR }}
              />
            </div>
            <ul className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
              {[
                {
                  label: "Essentials",
                  centavos: analysis.monthlyEssentialCentavos,
                  color: ESSENTIALS_COLOR,
                },
                {
                  label: "Debt minimums",
                  centavos: analysis.monthlyDebtMinimumsCentavos,
                  color: DEBTS_COLOR,
                },
              ].map((part) => (
                <li
                  key={part.label}
                  className="flex min-w-0 flex-wrap items-center gap-x-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: part.color }}
                  />
                  {part.label}
                  <MoneyAmount
                    centavos={part.centavos}
                    className="text-foreground font-mono font-semibold"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </CardTotal>

      <ul className="mt-4">
        {recorded.map(({ category, monthlyCentavos }) => (
          <ShareRow
            key={category.id}
            icon={
              <CategoryBadge
                icon={category.icon}
                name={category.name}
                direction="out"
                size="sm"
              />
            }
            name={category.name}
            amount={<MoneyAmount centavos={monthlyCentavos} />}
            note={formatShare(shareOf(monthlyCentavos))}
            share={shareOf(monthlyCentavos)}
            color={ESSENTIALS_COLOR}
          />
        ))}
        {analysis.debts.map((debt) => (
          <ShareRow
            key={debt.id}
            icon={
              <span className="bg-muted text-foreground/80 grid size-8 shrink-0 place-items-center rounded-xl">
                <Landmark aria-hidden="true" className="size-4" />
              </span>
            }
            name={debt.creditorName}
            detail="Minimum payment"
            amount={<MoneyAmount centavos={debt.minimumPaymentCentavos} />}
            note={formatShare(shareOf(debt.minimumPaymentCentavos))}
            share={shareOf(debt.minimumPaymentCentavos)}
            color={DEBTS_COLOR}
          />
        ))}
      </ul>
      {quiet.length > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Also essential, with nothing in this baseline: {list.format(quiet)}.
        </p>
      ) : null}
    </section>
  );
}

function monthsOfNeed(centavos: number, needCentavos: number) {
  if (needCentavos <= 0) return null;
  const months = centavos / needCentavos;
  return months < 0.05 ? "Under 0.1 month" : formatMonthCount(months);
}

function AccountRow({
  account,
  needCentavos,
  share,
  muted = false,
}: {
  account: RunwayAccount;
  needCentavos: number;
  share: number | null;
  muted?: boolean;
}) {
  const balance = account.currentBalanceCentavos;
  return (
    <ShareRow
      icon={
        <AccountLogo
          account={{
            name: account.name,
            account_type: account.accountType,
            provider_id: account.providerId,
          }}
        />
      }
      name={account.name}
      detail={
        balance < 0 ? (
          <span className="text-destructive font-medium">Overdrawn</span>
        ) : (
          accountTypeDetails(account.accountType).label
        )
      }
      amount={
        <MoneyAmount
          centavos={balance}
          className={cn(balance < 0 && "text-destructive")}
        />
      }
      note={balance > 0 ? monthsOfNeed(balance, needCentavos) : null}
      share={share}
      color="var(--primary)"
      muted={muted}
    />
  );
}

/**
 * The accounts runway draws on, each as months of need, and what the
 * accounts left out would add.
 */
export function RunwayFundsCard({
  analysis,
  accounts,
  onEdit,
}: {
  analysis: RunwayAnalysis;
  /** Every active account, chosen or not. */
  accounts: readonly RunwayAccount[];
  onEdit: () => void;
}) {
  const need = analysis.monthlyNeedCentavos;
  const byBalance = (a: RunwayAccount, b: RunwayAccount) =>
    b.currentBalanceCentavos - a.currentBalanceCentavos;
  const chosen = [...analysis.selectedAccounts].sort(byBalance);
  const positive = chosen.reduce(
    (sum, account) => sum + Math.max(account.currentBalanceCentavos, 0),
    0,
  );
  const chosenIds = new Set(chosen.map((account) => account.id));
  const leftOut = accounts
    .filter(
      (account) =>
        !chosenIds.has(account.id) && account.currentBalanceCentavos > 0,
    )
    .sort(byBalance);
  const leftOutCentavos = leftOut.reduce(
    (sum, account) => sum + account.currentBalanceCentavos,
    0,
  );
  // What runway would gain, from today's net, if they were counted too.
  const gain =
    need > 0
      ? (Math.max(analysis.netLiquidCentavos + leftOutCentavos, 0) -
          analysis.availableLiquidCentavos) /
        need
      : 0;

  return (
    <section
      aria-labelledby="runway-funds"
      data-spotlight
      className={dashboardCardClass}
    >
      <DashboardCardHeading
        id="runway-funds"
        icon={WalletCards}
        title="Runway funds"
        description="Each balance as months of need"
      />
      <CardTotal centavos={analysis.availableLiquidCentavos}>
        {analysis.netLiquidCentavos < 0 ? (
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Overdrawn accounts outweigh the rest, so runway counts{" "}
            <MoneyAmount centavos={0} className="font-mono" />.
          </p>
        ) : null}
      </CardTotal>

      <ul className="mt-4">
        {chosen.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            needCentavos={need}
            share={
              account.currentBalanceCentavos > 0 && positive > 0
                ? account.currentBalanceCentavos / positive
                : null
            }
          />
        ))}
      </ul>

      {leftOut.length > 0 ? (
        <>
          <p className="text-muted-foreground mt-4 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            Not counted
          </p>
          <ul className="mt-1">
            {leftOut.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                needCentavos={need}
                share={null}
                muted
              />
            ))}
          </ul>
        </>
      ) : null}

      <div className="bg-background/55 ring-border/80 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ring-1">
        <p className="text-muted-foreground min-w-0 flex-[1_1_12rem] text-xs leading-5">
          {leftOut.length === 0 ? (
            "Every account with money in it is counted."
          ) : gain >= 0.05 ? (
            <>
              Counting {leftOut.length === 1 ? "it" : "them"} would add about{" "}
              <span className="text-foreground font-semibold">
                {formatMonthCount(gain)}
              </span>{" "}
              of runway, if that money is truly free to spend.
            </>
          ) : (
            <>
              <MoneyAmount
                centavos={leftOutCentavos}
                className="text-foreground font-mono font-semibold"
              />{" "}
              more sits in accounts that are not counted.
            </>
          )}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Choose accounts
        </Button>
      </div>
    </section>
  );
}
