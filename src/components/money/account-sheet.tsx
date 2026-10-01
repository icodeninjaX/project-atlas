"use client";

import { Archive, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AccountForm } from "@/components/money/account-form";
import { BalanceAdjustmentForm } from "@/components/money/balance-adjustment-form";
import { CategoryBadge } from "@/components/money/category-icon";
import { FlowAmount } from "@/components/money/money-amount";
import { MoneySheet } from "@/components/money/money-sheet";
import {
  WalletCard,
  type WalletCardAccount,
} from "@/components/money/wallet-card";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { accountTypeDetails } from "@/lib/money/account-types";
import { relativeDayLabel } from "@/lib/money/history";
import { cn } from "@/lib/utils";

export type SheetAccount = WalletCardAccount & { id: string };

export type AccountActivityItem = {
  id: string;
  transaction_type: "expense" | "income";
  amount_centavos: number;
  transaction_date: string;
  merchant_or_source: string | null;
  category_name: string | null;
  category_icon: string | null;
};

const TABS = [
  { value: "activity", label: "Activity" },
  { value: "reconcile", label: "Reconcile" },
  { value: "edit", label: "Edit" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function SheetTabs({
  value,
  onChange,
  idBase,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
  idBase: string;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.value === value);
    const next = (index + offset + TABS.length) % TABS.length;
    onChange(TABS[next]!.value);
    tabRefs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Account sections"
      onKeyDown={moveFocus}
      className="border-border bg-muted/60 grid grid-cols-3 gap-1 rounded-xl border p-1"
    >
      {TABS.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "focus-visible:ring-ring min-h-10 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RecentActivity({
  account,
  activity,
  today,
}: {
  account: SheetAccount;
  activity: AccountActivityItem[];
  today: string;
}) {
  if (activity.length === 0) {
    return (
      <div className="border-border grid place-items-center rounded-2xl border border-dashed px-5 py-8 text-center">
        <p className="text-sm font-semibold">No transactions yet</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-5">
          Income and expenses you record against {account.name} will appear
          here.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/money/transactions?create=true">
            <Plus className="size-4" aria-hidden="true" />
            Record transaction
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ul className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
        {activity.map((item) => {
          const direction = item.transaction_type === "income" ? "in" : "out";
          return (
            <li key={item.id} className="flex min-w-0 items-center gap-3 p-3">
              <CategoryBadge
                icon={item.category_icon}
                name={item.category_name}
                direction={direction}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.merchant_or_source ||
                    item.category_name ||
                    "Transaction"}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {relativeDayLabel(item.transaction_date, today)}
                  {item.category_name ? ` · ${item.category_name}` : ""}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm font-semibold">
                <FlowAmount
                  centavos={item.amount_centavos}
                  direction={direction}
                />
              </p>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/money/transactions?account=${account.id}` as Route}
        className="text-primary focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        All {account.name} transactions
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function ArchiveAccountControl({
  account,
  onArchived,
}: {
  account: SheetAccount;
  onArchived: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:text-destructive w-full justify-start"
      >
        <Archive className="size-4" aria-hidden="true" />
        Archive account
      </Button>
    );
  }

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-2xl border p-4">
      <p className="text-sm font-semibold">Archive {account.name}?</p>
      <p className="text-muted-foreground mt-1 text-xs leading-5">
        It leaves your active total and account pickers. Its history stays, and
        you can restore it from Archived at any time.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(false)}
        >
          Keep it
        </Button>
        <OfflineMutationForm
          mutation="account.archive"
          onResult={(result) => {
            if (result.success) onArchived();
          }}
        >
          <input type="hidden" name="accountId" value={account.id} />
          <input type="hidden" name="archived" value="true" />
          <FormSubmitButton
            variant="destructive"
            pendingLabel="Archiving…"
            className="w-full"
          >
            Archive
          </FormSubmitButton>
        </OfflineMutationForm>
      </div>
    </div>
  );
}

function AccountSheetBody({
  account,
  activity,
  share,
  today,
  onArchived,
}: {
  account: SheetAccount;
  activity: AccountActivityItem[];
  share: string | null;
  today: string;
  onArchived: () => void;
}) {
  const [tab, setTab] = useState<Tab>("activity");
  const idBase = useId();
  const balance = Number(account.current_balance_centavos);

  return (
    <div className="space-y-5">
      <WalletCard account={account} size="large" />
      {share ? (
        <p className="text-muted-foreground -mt-2 text-xs">
          {share} of the money across your active accounts.
        </p>
      ) : null}

      <SheetTabs value={tab} onChange={setTab} idBase={idBase} />

      <div
        role="tabpanel"
        id={`${idBase}-panel-${tab}`}
        aria-labelledby={`${idBase}-tab-${tab}`}
        className="@container min-w-0"
      >
        {tab === "activity" ? (
          <RecentActivity account={account} activity={activity} today={today} />
        ) : tab === "reconcile" ? (
          <BalanceAdjustmentForm
            key={balance}
            accountId={account.id}
            accountName={account.name}
            currentBalanceCentavos={balance}
            today={today}
          />
        ) : (
          <AccountForm account={account} />
        )}
      </div>

      <div className="border-border border-t pt-3">
        <ArchiveAccountControl account={account} onArchived={onArchived} />
      </div>
    </div>
  );
}

/** Everything you can do with one account, opened from its card. */
export function AccountSheet({
  account,
  activity,
  share,
  today,
  onClose,
}: {
  account: SheetAccount | null;
  activity: AccountActivityItem[];
  share: string | null;
  today: string;
  onClose: () => void;
}) {
  return (
    <MoneySheet
      open={account !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      eyebrow={account ? accountTypeDetails(account.account_type).label : null}
      title={account?.name ?? "Account"}
      closeLabel="Close account details"
    >
      {account ? (
        <AccountSheetBody
          key={account.id}
          account={account}
          activity={activity}
          share={share}
          today={today}
          onArchived={onClose}
        />
      ) : null}
    </MoneySheet>
  );
}
