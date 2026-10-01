import { Archive, ArrowLeftRight, Plus, WalletCards } from "lucide-react";
import { AccountCreatePanel } from "@/components/money/account-create-panel";
import {
  QuickActionButton,
  QuickActionLink,
  QuickActions,
} from "@/components/money/quick-actions";

/** The accounts page's actions on phones, inside the total-balance hero. */
export function AccountsQuickActions() {
  return (
    <QuickActions>
      <QuickActionLink
        href="/money/transactions?create=true"
        icon={Plus}
        label="Record"
        primary
      />
      <QuickActionLink
        href="/money/transfers"
        icon={ArrowLeftRight}
        label="Transfer"
      />
      <AccountCreatePanel
        trigger={<QuickActionButton icon={WalletCards} label="Add account" />}
      />
      <QuickActionLink
        href="/money/accounts/archived"
        icon={Archive}
        label="Archived"
      />
    </QuickActions>
  );
}
