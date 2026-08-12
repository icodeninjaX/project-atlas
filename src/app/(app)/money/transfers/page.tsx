import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { TransferForm } from "@/components/money/transfer-form";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Record transfer" };

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TransfersPage() {
  const supabase = await createClient();
  const accountsResult = supabase
    ? await supabase
        .from("financial_accounts")
        .select("id,name")
        .eq("is_archived", false)
        .order("name")
    : { data: [] };

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Money movement / Transfer"
        title="Move money between accounts"
        description="Record an internal transfer without counting it as income or an expense."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/transactions">Money movement</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/accounts">Accounts</Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TransferForm
          accounts={accountsResult.data ?? []}
          today={todayInManila()}
        />

        <Card>
          <CardContent>
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <ArrowLeftRight className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Transfers stay balance-neutral
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              The amount leaves the source account and enters the destination
              account. Your combined balance does not change.
            </p>
            <p className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs leading-5">
              Both accounts must be active, and the source and destination must
              be different.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
