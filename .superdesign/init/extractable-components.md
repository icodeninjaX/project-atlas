# Extractable Components

## Layout Components

## AppShell
- Source: `src/components/atlas/app-shell.tsx`
- Category: layout
- Description: Desktop sidebar and mobile bottom navigation wrapping authenticated content.
- Extractable props: `activeItem` (string, default: `dashboard`), `moreOpen` (boolean, default: false)
- Hardcoded: ATLAS mark, navigation labels and hrefs, Lucide icon names, sidebar width, bottom-nav layout, safe-area spacing, utility classes

## AppHeader
- Source: `src/components/atlas/app-header.tsx`
- Category: layout
- Description: Authenticated top bar with user identity and global actions.
- Extractable props: `displayName` (string, default: `ATLAS user`), `syncState` (string, default: `synced`), `showInstall` (boolean, default: false)
- Hardcoded: Search, theme, quick-task, and sign-out actions; icon names; button variants; utility classes

## PublicHeader
- Source: `src/app/(public)/layout.tsx`
- Category: layout
- Description: Public header with ATLAS identity, theme control, and login action.
- Extractable props: `activeItem` (string, default: `home`)
- Hardcoded: ATLAS mark, ATLAS label, login href/text, height, spacing, utility classes

## AuthCard
- Source: `src/components/auth/auth-card.tsx`
- Category: layout
- Description: Centered public authentication content wrapper.
- Extractable props: `eyebrow`, `title`, `description`, `showFooter` (boolean, default: true)
- Hardcoded: max width, vertical centering, card surface, product tagline, spacing, utility classes

## Basic Components

## PageHeading
- Source: `src/components/shared/page-heading.tsx`
- Category: basic
- Description: Responsive page title block with optional action group.
- Extractable props: `eyebrow`, `title`, `description`, `showActions` (boolean, default: true)
- Hardcoded: heading type scale, responsive stacking breakpoint, spacing, utility classes

## EmptyState
- Source: `src/components/shared/empty-state.tsx`
- Category: basic
- Description: Dashed empty-state panel with icon, copy, and optional action.
- Extractable props: `title`, `description`, `showAction` (boolean, default: true)
- Hardcoded: icon treatment, min height, border style, spacing, utility classes

## AtlasMark
- Source: `src/components/atlas/atlas-mark.tsx`
- Category: basic
- Description: Code-rendered ATLAS brand mark built from the actual source spans and theme tokens.
- Extractable props: none
- Hardcoded: three mark strokes/dot, 36px container, primary color treatments, rounded shape

## AccountCard
- Source: `src/components/money/account-card.tsx`
- Category: basic
- Description: Financial account summary with balance and expandable account actions.
- Extractable props: `accountName`, `accountType`, `institution`, `balance`, `isArchived`, `showActions`
- Hardcoded: money typography, action labels, card shape, icon names, utility classes

## Button
- Source: `src/components/ui/button.tsx`
- Category: basic
- Description: Shared button family.
- Extractable props: `variant`, `size`, `disabled`
- Hardcoded: style variants, dimensions, radii, focus rings, utility classes

## Card
- Source: `src/components/ui/card.tsx`
- Category: basic
- Description: Shared bordered content surface.
- Extractable props: none
- Hardcoded: background/border tokens, 16px radius, header/content spacing

## Input
- Source: `src/components/ui/input.tsx`
- Category: basic
- Description: Shared text input with mobile touch sizing.
- Extractable props: `placeholder`, `disabled`
- Hardcoded: 44px minimum height, border/focus styles, padding, typography
