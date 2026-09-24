import type { Signal } from "@/lib/signals/engine";

/** Deterministic, ephemeral provenance for signals with a specific source record. */
export function getSignalSourceReferences(signal: Signal) {
  return (signal.sourceRefs ?? []).map((reference) => ({
    origin: "derived" as const,
    source: { type: "signal" as const, id: signal.id, title: signal.title },
    target: reference,
  }));
}
