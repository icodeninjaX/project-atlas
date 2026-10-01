"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Shapes } from "lucide-react";
import { useId, useRef, useState } from "react";
import { CategoryIcon } from "@/components/money/category-icon";
import { cn } from "@/lib/utils";

export type CategorySelectOption = {
  id: string;
  name: string;
  icon?: string | null;
};

/**
 * Category dropdown for the record form. The trigger reads like a filled
 * field (icon, name, chevron) and opens a floating list anchored under it.
 * Radix keeps a hidden native select in the form, so form data and
 * `required` work as with any other field; a missing category is reported
 * here, on the visible trigger, instead of on that hidden select. When large
 * text leaves less than 14rem, the icon squares step aside so names keep the
 * room.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  name = "categoryId",
  label = "Category",
}: {
  categories: CategorySelectOption[];
  value: string;
  onChange: (categoryId: string) => void;
  name?: string;
  label?: string;
}) {
  const triggerId = useId();
  const errorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [missing, setMissing] = useState(false);
  const selected = categories.find((category) => category.id === value);
  // Any valid category clears the message, including one set by the form
  // itself (a remembered merchant), so a later reset starts clean.
  if (missing && selected) setMissing(false);
  const showMissing = missing && !selected;

  return (
    <div
      className="@container/category min-w-0"
      onInvalidCapture={(event) => {
        if (!(event.target instanceof HTMLSelectElement)) return;
        event.preventDefault();
        setMissing(true);
        triggerRef.current?.focus();
      }}
    >
      <label htmlFor={triggerId} className="text-sm font-semibold">
        {label}
      </label>
      {categories.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          No categories for this type yet.
        </p>
      ) : (
        <Select.Root
          name={name}
          required
          value={value}
          onValueChange={onChange}
        >
          <Select.Trigger
            ref={triggerRef}
            id={triggerId}
            aria-invalid={showMissing || undefined}
            aria-describedby={showMissing ? errorId : undefined}
            className={cn(
              "group border-border bg-background/60 focus-visible:ring-ring mt-3 flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl border py-2 pr-3.5 pl-2 text-left transition-[border-color,box-shadow,background-color] duration-150 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:outline-none @max-[14rem]/category:pl-3.5",
              "hover:bg-muted/60 data-[state=open]:border-primary data-[state=open]:bg-card data-[state=open]:ring-primary/15 data-[state=open]:ring-4",
              "aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:ring-4",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl transition-colors @max-[14rem]/category:hidden",
                selected
                  ? "bg-primary-solid text-primary-solid-foreground shadow-[0_6px_16px_-8px_var(--primary-solid)]"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {selected ? (
                <CategoryIcon
                  icon={selected.icon}
                  categoryName={selected.name}
                  className="size-[1.125rem]"
                />
              ) : (
                <Shapes className="size-[1.125rem]" />
              )}
            </span>
            <span className="group-data-[placeholder]:text-muted-foreground line-clamp-2 min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere] hyphens-auto group-data-[placeholder]:font-medium">
              <Select.Value placeholder="Choose a category">
                {selected?.name}
              </Select.Value>
            </span>
            <Select.Icon asChild>
              <ChevronDown
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            {/* Above money sheets (z-60), so it opens inside the edit sheet. */}
            <Select.Content
              position="popper"
              side="bottom"
              sideOffset={8}
              collisionPadding={16}
              className="border-border bg-card animate-money-dropdown z-[70] max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] [transform-origin:var(--radix-select-content-transform-origin)] overflow-hidden rounded-2xl border shadow-[0_24px_48px_-16px_rgb(7_10_15/0.45)]"
            >
              <Select.ScrollUpButton className="text-muted-foreground grid h-7 place-items-center">
                <ChevronUp aria-hidden="true" className="size-4" />
              </Select.ScrollUpButton>
              <Select.Viewport className="@container/category-list p-1.5">
                {categories.map((category) => (
                  <Select.Item
                    key={category.id}
                    value={category.id}
                    className="group/item text-foreground/90 data-[highlighted]:bg-muted data-[state=checked]:text-foreground relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl py-1.5 pr-10 pl-1.5 text-sm font-medium outline-none select-none [-webkit-tap-highlight-color:transparent] @max-[14rem]/category-list:pr-8 @max-[14rem]/category-list:pl-3"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-muted text-foreground/75 group-data-[highlighted]/item:bg-card group-data-[state=checked]/item:bg-primary-solid group-data-[state=checked]/item:text-primary-solid-foreground grid size-8 shrink-0 place-items-center rounded-lg transition-colors @max-[14rem]/category-list:hidden"
                    >
                      <CategoryIcon
                        icon={category.icon}
                        categoryName={category.name}
                        className="size-4"
                      />
                    </span>
                    {/* ItemText takes no className, so the wrap rules sit on a span. */}
                    <span className="min-w-0 [overflow-wrap:anywhere] hyphens-auto">
                      <Select.ItemText>{category.name}</Select.ItemText>
                    </span>
                    <Select.ItemIndicator className="text-primary absolute right-3 inline-flex @max-[14rem]/category-list:right-2.5">
                      <Check
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2.5}
                      />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton className="text-muted-foreground grid h-7 place-items-center">
                <ChevronDown aria-hidden="true" className="size-4" />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
      {showMissing ? (
        <p id={errorId} className="text-destructive mt-2 text-xs font-medium">
          Choose a category to record this.
        </p>
      ) : null}
    </div>
  );
}
