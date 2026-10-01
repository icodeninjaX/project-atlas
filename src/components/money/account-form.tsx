"use client";

import Image from "next/image";
import { Building2, Check, Search, WalletCards } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ACCOUNT_TYPE_OPTIONS } from "@/components/money/account-visuals";
import { WalletCard } from "@/components/money/wallet-card";
import { useOfflineActionState } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import type { AccountType } from "@/lib/money/account-types";
import { parsePesoInput } from "@/lib/money/history";
import {
  PHILIPPINE_ACCOUNT_PROVIDERS,
  type PhilippineAccountProvider,
} from "@/lib/money/ph-account-providers";
import { cn } from "@/lib/utils";

const initial: MoneyActionState = { success: false, message: "" };

type AccountCategory = AccountType;

function StepLegend({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <legend className="flex items-center gap-2.5 text-sm font-semibold">
      <span
        aria-hidden="true"
        className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-bold"
      >
        {step}
      </span>
      {children}
    </legend>
  );
}

function providerMatchesSearch(
  provider: PhilippineAccountProvider,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase("en-PH");
  if (!query) return true;
  return [
    provider.displayName,
    provider.legalName,
    provider.id,
    ...provider.aliases,
  ].some((value) => value.toLocaleLowerCase("en-PH").includes(query));
}

function usesProvider(category: AccountCategory) {
  return (
    category === "bank" || category === "e_wallet" || category === "savings"
  );
}

function providersForCategory(category: AccountCategory) {
  if (category === "e_wallet") {
    return PHILIPPINE_ACCOUNT_PROVIDERS.filter(
      (provider) => provider.kind === "e_wallet",
    );
  }
  return PHILIPPINE_ACCOUNT_PROVIDERS.filter(
    (provider) => provider.kind === "bank" || provider.kind === "digital_bank",
  );
}

function previewBalanceCentavos(value: string) {
  const negative = value.trim().startsWith("-");
  const centavos = parsePesoInput(value.trim().replace(/^-/, "")) ?? 0;
  return negative ? -centavos : centavos;
}

function AccountCreateForm({
  action,
  pending,
  form,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  form: React.RefObject<HTMLFormElement | null>;
}) {
  const [category, setCategory] = useState<AccountCategory>("e_wallet");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [customProviderSelected, setCustomProviderSelected] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0.00");

  const availableProviders = useMemo(
    () => providersForCategory(category),
    [category],
  );
  const visibleProviders = useMemo(
    () =>
      availableProviders.filter((provider) =>
        providerMatchesSearch(provider, search),
      ),
    [availableProviders, search],
  );
  const selectedProvider = useMemo(
    () =>
      PHILIPPINE_ACCOUNT_PROVIDERS.find(
        (provider) => provider.id === selectedProviderId,
      ) ?? null,
    [selectedProviderId],
  );

  function selectCategory(nextCategory: AccountCategory) {
    setCategory(nextCategory);
    setSelectedProviderId(null);
    setCustomProviderSelected(false);
    setSearch("");
    setName("");
    setInstitution("");
  }

  function selectProvider(provider: PhilippineAccountProvider) {
    setSelectedProviderId(provider.id);
    setCustomProviderSelected(false);
    setName(provider.displayName);
    setInstitution(provider.legalName);
  }

  function selectCustomProvider() {
    setSelectedProviderId(null);
    setCustomProviderSelected(true);
    setName("");
    setInstitution("");
  }

  const previewAccount = {
    name: name.trim() || "Your account",
    account_type: category,
    institution: institution.trim() || null,
    provider_id: selectedProvider?.id ?? null,
    current_balance_centavos: previewBalanceCentavos(openingBalance),
  };

  return (
    <form
      ref={form}
      action={action}
      className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]"
    >
      <input type="hidden" name="accountType" value={category} />
      <input type="hidden" name="providerId" value={selectedProviderId ?? ""} />

      <div className="min-w-0 space-y-8">
        <fieldset>
          <StepLegend step={1}>What kind of account is it?</StepLegend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCOUNT_TYPE_OPTIONS.map((item) => {
              const Icon = item.icon;
              const selected = category === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectCategory(item.value)}
                  className={cn(
                    "focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-14 items-center gap-3 rounded-2xl border px-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl transition-colors",
                      selected
                        ? "bg-primary-solid text-primary-solid-foreground"
                        : "bg-muted",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {usesProvider(category) ? (
          <fieldset>
            <StepLegend step={2}>
              Choose your {category === "e_wallet" ? "wallet" : "bank"}
            </StepLegend>
            <label className="relative mt-3 block">
              <span className="sr-only">Search banks and wallets</span>
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or alias"
                aria-label="Search banks and wallets"
                className="pl-9"
              />
            </label>

            <p
              className="text-muted-foreground mt-2 text-xs"
              aria-live="polite"
            >
              {visibleProviders.length} provider
              {visibleProviders.length === 1 ? "" : "s"}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleProviders.map((provider) => {
                const selected = selectedProviderId === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Choose ${provider.displayName}`}
                    onClick={() => selectProvider(provider)}
                    className={cn(
                      "focus-visible:ring-ring focus-visible:ring-offset-background relative flex min-h-20 min-w-0 flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {selected ? (
                      <Check
                        className="text-primary absolute top-3 right-3 size-4"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
                      {provider.iconPath ? (
                        <Image
                          src={provider.iconPath}
                          alt=""
                          width={36}
                          height={36}
                          className="size-full rounded-full object-cover"
                          aria-hidden="true"
                        />
                      ) : (
                        <Building2
                          className="size-4 text-slate-700"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="w-full truncate text-xs font-semibold">
                      {provider.displayName}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                aria-pressed={customProviderSelected}
                onClick={selectCustomProvider}
                className={cn(
                  "focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-20 min-w-0 flex-col items-start justify-between gap-2 rounded-2xl border border-dashed p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  customProviderSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                <span className="bg-muted grid size-9 place-items-center rounded-full">
                  <WalletCards className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold">
                  Custom bank / wallet
                </span>
              </button>
            </div>

            {visibleProviders.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                No provider found. Choose custom to add it manually.
              </p>
            ) : null}
          </fieldset>
        ) : null}
      </div>

      <div className="min-w-0 space-y-4 md:sticky md:top-0 md:self-start">
        <section aria-labelledby="account-preview-title">
          <p
            id="account-preview-title"
            className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase"
          >
            Card preview
          </p>
          <WalletCard
            account={previewAccount}
            balanceLabel="Opening balance"
            className="mt-3"
          />
        </section>

        <fieldset className="min-w-0">
          <StepLegend step={usesProvider(category) ? 3 : 2}>
            Name it and set the balance
          </StepLegend>
          <div className="border-border bg-card mt-3 grid gap-4 rounded-2xl border p-4">
            <label className="text-muted-foreground min-w-0 text-xs">
              Account name
              <Input
                name="name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. My everyday wallet"
                aria-label="Account name"
                className="mt-1.5"
              />
            </label>
            <label className="text-muted-foreground min-w-0 text-xs">
              Institution
              <Input
                name="institution"
                maxLength={120}
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Optional bank or provider"
                aria-label="Institution"
                className="mt-1.5"
              />
            </label>
            <label className="text-muted-foreground min-w-0 text-xs">
              Opening balance (PHP)
              <Input
                name="openingBalance"
                inputMode="decimal"
                value={openingBalance}
                onChange={(event) => setOpeningBalance(event.target.value)}
                required
                aria-label="Opening balance in pesos"
                className="mt-1.5 font-mono"
              />
            </label>
            <Button
              type="submit"
              pending={pending}
              pendingLabel="Adding…"
              className="w-full"
            >
              Add account
            </Button>
          </div>
        </fieldset>
      </div>
    </form>
  );
}

export function AccountForm({
  account,
  onSuccess,
}: {
  account?: {
    id: string;
    name: string;
    account_type: string;
    institution: string | null;
    provider_id?: string | null;
  };
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useOfflineActionState(
    account ? "account.update" : "account.create",
    initial,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      form.current?.reset();
      onSuccess?.();
    } else toast.error(state.message);
  }, [onSuccess, state]);

  if (!account) {
    return <AccountCreateForm action={action} pending={pending} form={form} />;
  }

  return (
    <form
      ref={form}
      action={action}
      className="grid min-w-0 grid-cols-1 gap-4 @[22rem]:grid-cols-2"
    >
      <input type="hidden" name="accountId" value={account.id} />
      {account.provider_id ? (
        <input type="hidden" name="providerId" value={account.provider_id} />
      ) : null}
      <label className="text-muted-foreground min-w-0 text-xs">
        Account name
        <Input
          name="name"
          required
          maxLength={120}
          defaultValue={account.name}
          placeholder="e.g. Maya wallet"
          aria-label="Account name"
          className="mt-1.5"
        />
      </label>
      <label className="text-muted-foreground min-w-0 text-xs">
        Account type
        <select
          name="accountType"
          defaultValue={account.account_type}
          aria-label="Account type"
          className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm"
        >
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-muted-foreground min-w-0 text-xs @[22rem]:col-span-2">
        Institution
        <Input
          name="institution"
          maxLength={120}
          defaultValue={account.institution ?? ""}
          placeholder="Optional bank or provider"
          aria-label="Institution"
          className="mt-1.5"
        />
      </label>
      <Button
        type="submit"
        pending={pending}
        pendingLabel="Saving…"
        className="w-full @[22rem]:col-span-2"
      >
        Save changes
      </Button>
    </form>
  );
}
