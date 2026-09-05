"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AccountForm } from "@/components/money/account-form";
import { Button } from "@/components/ui/button";

export function AccountCreatePanel() {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="add-account-heading" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="add-account-heading" className="text-lg font-semibold">
            Add an account
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Add cash, bank, e-wallet, savings, or investment balances.
          </p>
        </div>
        <Button
          type="button"
          aria-expanded={open}
          aria-controls="account-create-form"
          onClick={() => setOpen((current) => !current)}
        >
          <Plus className="size-4" aria-hidden="true" />
          {open ? "Close form" : "Add account"}
        </Button>
      </div>
      {open ? (
        <div id="account-create-form" className="mt-4">
          <AccountForm onSuccess={() => setOpen(false)} />
        </div>
      ) : null}
    </section>
  );
}
