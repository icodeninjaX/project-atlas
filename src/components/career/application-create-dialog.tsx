"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ApplicationForm } from "@/components/career/application-form";
import { Button } from "@/components/ui/button";

export const careerDialogOverlayClass =
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] motion-safe:animate-analyst-fade";

export const careerDialogContentClass =
  "bg-background fixed inset-0 z-50 overflow-y-auto outline-none sm:inset-y-6 sm:left-1/2 sm:w-[min(48rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:shadow-2xl lg:inset-y-10";

export const careerDialogHeaderClass =
  "bg-background sticky top-0 z-20 flex items-start justify-between gap-4 border-b px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6 sm:pt-5";

export const careerDialogFooterClass =
  "bg-background sticky bottom-0 z-20 -mx-4 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 sm:pb-4";

export function ApplicationCreateDialog() {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" size="sm" className="min-h-10 sm:min-h-9">
          <Plus className="size-4" aria-hidden="true" />
          Add application
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={careerDialogOverlayClass} />
        <Dialog.Content className={careerDialogContentClass}>
          <header className={careerDialogHeaderClass}>
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.025em]">
                Add a job application
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                Only the company and role are required. Add the rest now or as
                it happens.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close new application form"
                className="-mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>
          <ApplicationForm
            className="px-4 pt-4 sm:px-6 sm:pt-6"
            footerClassName={careerDialogFooterClass}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
