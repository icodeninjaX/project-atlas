"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ApplicationForm } from "@/components/career/application-form";
import { Button } from "@/components/ui/button";

export function ApplicationCreateDialog() {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" size="sm" className="min-h-10 sm:min-h-9">
          <Plus className="size-4" />
          Add application
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="bg-background fixed inset-0 z-50 overflow-y-auto p-4 outline-none sm:inset-6 sm:left-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:p-6 lg:inset-y-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-[-0.025em]">
                Add a job application
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                Enter the role details, application date, and your next planned
                action.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close new application form"
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <ApplicationForm
            className="border-0 bg-transparent p-0"
            onSuccess={closeDialog}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
