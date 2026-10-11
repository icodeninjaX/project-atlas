"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { AccountForm } from "@/components/money/account-form";
import { Button } from "@/components/ui/button";

/**
 * Opens the new-account dialog. `trigger` replaces the default button, for
 * example with a quick action; it must accept a ref and props.
 */
export function AccountCreatePanel({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button type="button">
            <Plus className="size-4" aria-hidden="true" />
            Add account
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-analyst-fade fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="bg-background fixed inset-0 z-[60] overflow-y-auto p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none sm:inset-y-6 sm:left-1/2 sm:w-[min(calc(100vw-3rem),58rem)] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:p-7 sm:shadow-2xl lg:inset-y-10">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.025em]">
                New account
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                Enter what it holds today. Transactions and transfers update the
                balance from there.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close new account form"
                className="-mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <AccountForm onSuccess={closeDialog} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
