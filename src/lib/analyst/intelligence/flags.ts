import "server-only";

/**
 * Server-controlled switch for the versioned Analyst intelligence path. Off
 * unless `ATLAS_ANALYST_V2=1`; the legacy freeform route is unaffected either
 * way. A browser can neither see nor set this flag.
 */
export function analystIntelligenceV2Enabled() {
  return process.env.ATLAS_ANALYST_V2 === "1";
}
