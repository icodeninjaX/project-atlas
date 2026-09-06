"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { AccountForm } from "@/components/money/account-form";
import { Button } from "@/components/ui/button";

export function AccountCreatePanel() {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden="true" />
          Add account
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="bg-background fixed inset-0 z-50 overflow-y-auto p-4 outline-none sm:inset-6 sm:left-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:p-6 lg:inset-y-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold tracking-[-0.025em]">
              New account
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close new account form"
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
