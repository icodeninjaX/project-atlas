# Shared UI Components

## Button
- Path: `src/components/ui/button.tsx`
- Description: CVA-powered button primitive with default, secondary, ghost, and destructive variants.
- Key props: native button props, `variant`, `size`, `asChild`

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive",
      },
      size: {
        default: "h-10",
        sm: "min-h-9 rounded-lg px-3 text-xs",
        lg: "min-h-12 px-5",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
```

## Card
- Path: `src/components/ui/card.tsx`
- Description: Bordered surface primitive with header, title, and content helpers.
- Key props: native `section`, `div`, and `h2` props

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "border-border bg-card text-card-foreground rounded-2xl border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
```

## Input
- Path: `src/components/ui/input.tsx`
- Description: Full-width form input with a mobile-friendly 44px minimum touch height.
- Key props: native input props

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-border bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 flex min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
```

## PageHeading
- Path: `src/components/shared/page-heading.tsx`
- Description: Responsive page heading with optional eyebrow and action group.
- Key props: `eyebrow`, `title`, `description`, `actions`

```tsx
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-primary mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
```

## EmptyState
- Path: `src/components/shared/empty-state.tsx`
- Description: Reusable dashed empty-state panel with icon, copy, and optional action.
- Key props: `icon`, `title`, `description`, `action`

```tsx
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border bg-card/40 grid min-h-72 place-items-center rounded-2xl border border-dashed p-8 text-center">
      <div className="max-w-sm">
        <div className="border-primary/20 bg-primary/10 text-primary mx-auto grid size-11 place-items-center rounded-xl border">
          <Icon className="size-5" />
        </div>
        <h2 className="mt-5 text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
```

## ModuleEmptyPage
- Path: `src/components/shared/module-empty-page.tsx`
- Description: Standard empty feature page composed from PageHeading, EmptyState, and Button.
- Key props: eyebrow, title, description, icon, empty-state copy, action label

```tsx
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { PageHeading } from "./page-heading";

export function ModuleEmptyPage({
  eyebrow,
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Button>{actionLabel}</Button>}
      />
      <div className="mt-8">
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
          action={<Button variant="secondary">{actionLabel}</Button>}
        />
      </div>
    </div>
  );
}
```

## AuthCard
- Path: `src/components/auth/auth-card.tsx`
- Description: Centered public authentication container with explanatory copy and footer.
- Key props: `eyebrow`, `title`, `description`, `children`, `footer`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-md place-items-center px-5 py-12">
      <div className="w-full">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.2em] uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {description}
        </p>
        <div className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-6">
          {children}
        </div>
        {footer && (
          <p className="text-muted-foreground mt-5 text-center text-sm">
            {footer}
          </p>
        )}
        <p className="text-muted-foreground mt-8 text-center text-xs">
          <Link href="/" className="hover:text-foreground">
            Your personal operating system.
          </Link>
        </p>
      </div>
    </main>
  );
}
```
