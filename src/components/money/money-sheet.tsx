"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A detail panel for one money record: a bottom sheet on phones and a
 * floating side panel from `sm` up. Content scrolls inside; the header and
 * close button stay put.
 */
export function MoneySheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  closeLabel,
  onOpenAutoFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  /** Lets a sheet send focus somewhere other than its first control. */
  onOpenAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-analyst-fade fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          // Radix links the description automatically; without one, an
          // explicit undefined tells it the omission is deliberate.
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={onOpenAutoFocus}
          className="bg-background data-[state=open]:animate-analyst-sheet sm:data-[state=open]:animate-money-sheet-side fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-[1.75rem] border-t shadow-[0_-24px_60px_rgb(7_10_15/0.35)] outline-none sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[min(30rem,calc(100vw-1.5rem))] sm:rounded-[1.75rem] sm:border sm:shadow-[0_24px_70px_rgb(7_10_15/0.4)]"
        >
          <span
            aria-hidden="true"
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full sm:hidden"
          />
          <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3 pb-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <Dialog.Title className="mt-1 text-xl font-semibold tracking-[-0.025em] break-words">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-5">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={closeLabel}
                className="-mr-2 shrink-0"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
