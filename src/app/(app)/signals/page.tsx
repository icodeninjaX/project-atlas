import { SignalsScreen } from "@/components/signals/signals-screen";
import type { Signal } from "@/lib/signals/engine";
import { loadSignals } from "@/lib/signals/server";
import { parseSignalFilters } from "@/lib/signals/view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Signals" };

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; severity?: string }>;
}) {
  const filters = parseSignalFilters(await searchParams);
  const now = new Date();
  const supabase = await createClient();
  let signals: Signal[] | null = null;
  if (supabase) {
    try {
      signals = await loadSignals(supabase, now);
    } catch {
      signals = null;
    }
  }

  return (
    <SignalsScreen
      signals={signals}
      filters={filters}
      checkedAt={now.toISOString()}
    />
  );
}
