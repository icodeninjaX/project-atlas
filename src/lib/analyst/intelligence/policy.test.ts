import { describe, expect, it } from "vitest";
import {
  analystCapabilities,
  CAPABILITY_MANIFEST,
  PROCESS_CAPABILITIES,
} from "./capabilities";
import type { EvidenceV2 } from "./contracts";
import { CORPUS_CAPABILITIES } from "./evaluation/corpus";
import { PERIODS } from "./evaluation/fixtures";
import { metricEvidence } from "./evaluation/v2-fixtures";
import {
  CONSENT_VERSION,
  ProviderPolicyViolation,
  SHARED_ROUTE,
  assertProviderPayload,
  availableRoutes,
  consentFingerprint,
  contextValidFor,
  describeConsent,
  filterProviderPayload,
  legacyEquivalentConsent,
  parseConsent,
  type AnalystConsent,
  type ProviderPayload,
  type ProviderRoute,
  type ProviderStage,
} from "./policy";

const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");
const verified: ProviderRoute = {
  id: "openai_non_sharing",
  sharing: "non_sharing_verified",
  profiles: ["aggregate", "basic_context", "sensitive_narrative"],
};
const scope = {
  id: "whole_domain:x",
  type: "whole_domain" as const,
  description: "x",
};
const money = metricEvidence({
  id: "money",
  metricKey: "expense_centavos",
  value: 1,
  period: PERIODS.currentMonthToDate,
  scope,
});
const review: EvidenceV2 = { ...money, id: "review.score", domain: "reviews" };
const reflection: EvidenceV2 = {
  ...money,
  kind: "text_excerpt",
  id: "review.text",
  domain: "reviews",
  text: "A private reflection.",
  attributedTo: "user",
  sharing: { route: "sensitive_narrative", allowedFields: ["text", "period"] },
} as EvidenceV2;

const payload = (stage: ProviderStage): ProviderPayload => ({
  stage,
  question: "How were my reviews and spending this month?",
  history: [
    {
      question: "How were my reviews?",
      answer: "Scores were recorded.",
      domains: ["reviews"],
      profiles: ["aggregate"],
    },
    {
      question: "And spending?",
      answer: "Expenses were recorded.",
      domains: ["money"],
      profiles: ["aggregate"],
    },
  ],
  evidence: [money, review, reflection],
  labels: [
    { handle: "goal:x", domain: "goals", text: "A goal title" },
    { handle: "category:y", domain: "money", text: "Groceries" },
  ],
});

describe("Analyst consent", () => {
  it("accepts only the current version with aggregates", () => {
    expect(parseConsent(consent)).toEqual(consent);
    expect(parseConsent({ ...consent, version: "1" })).toBeNull();
    expect(
      parseConsent({ ...consent, profiles: ["basic_context"] }),
    ).toBeNull();
    expect(parseConsent({ ...consent, extra: true })).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(CONSENT_VERSION).toBe("2");
  });

  it("invalidates cached context when consent narrows", () => {
    const fingerprint = consentFingerprint(consent);
    const narrowed: AnalystConsent = {
      ...consent,
      domains: consent.domains.filter((d) => d !== "reviews"),
    };
    expect(contextValidFor(fingerprint, consent)).toBe(true);
    expect(contextValidFor(fingerprint, narrowed)).toBe(false);
    expect(contextValidFor(fingerprint, null)).toBe(false);
    // Order does not matter; content does.
    expect(
      consentFingerprint({
        ...consent,
        domains: [...consent.domains].reverse(),
      }),
    ).toBe(fingerprint);
  });

  it("describes what is and is not sent, without overstating the route", () => {
    expect(describeConsent(null)).toEqual([
      "Analyst sends nothing to an AI provider.",
    ]);
    const lines = describeConsent({
      ...consent,
      profiles: ["aggregate", "sensitive_narrative"],
    });
    expect(lines.join(" ")).toMatch(/never sends record names and titles/);
    expect(lines.join(" ")).toMatch(/stay in ATLAS until a provider route/);
    expect(lines.join(" ")).toMatch(
      /may use what it receives to improve its models/,
    );
  });
});

describe("provider payload policy", () => {
  it("removes a revoked domain from every stage, including history", () => {
    const revoked: AnalystConsent = {
      ...consent,
      profiles: ["aggregate", "basic_context", "sensitive_narrative"],
      domains: consent.domains.filter((d) => d !== "reviews"),
    };
    for (const stage of ["planner", "writer", "critic", "repair"] as const) {
      const { payload: filtered, excluded } = filterProviderPayload(
        payload(stage),
        revoked,
        verified,
      );
      expect(
        filtered.evidence.map((item) => item.id),
        stage,
      ).toEqual(["money"]);
      expect(
        filtered.history.map((turn) => turn.question),
        stage,
      ).toEqual(["And spending?"]);
      expect(
        filtered.labels.map((label) => label.handle),
        stage,
      ).toEqual(["goal:x", "category:y"]);
      expect(
        excluded.every((item) => item.reason === "domain_not_consented"),
        stage,
      ).toBe(true);
      expect(() =>
        assertProviderPayload(filtered, revoked, verified),
      ).not.toThrow();
      expect(() =>
        assertProviderPayload(payload(stage), revoked, verified),
      ).toThrow(ProviderPolicyViolation);
    }
  });

  it("keeps names and private text off the shared route even with consent", () => {
    const everything: AnalystConsent = {
      ...consent,
      profiles: ["aggregate", "basic_context", "sensitive_narrative"],
    };
    const { payload: filtered, excluded } = filterProviderPayload(
      payload("writer"),
      everything,
      SHARED_ROUTE,
    );
    expect(filtered.evidence.map((item) => item.id)).toEqual([
      "money",
      "review.score",
    ]);
    expect(filtered.labels).toEqual([]);
    expect(
      excluded.filter((item) => item.reason === "route_ineligible"),
    ).toHaveLength(3);
    expect(() =>
      assertProviderPayload(payload("writer"), everything, SHARED_ROUTE),
    ).toThrow(ProviderPolicyViolation);
  });

  it("sends nothing without consent", () => {
    expect(
      filterProviderPayload(payload("planner"), null, SHARED_ROUTE).payload,
    ).toMatchObject({
      evidence: [],
      labels: [],
      history: [],
    });
    expect(() =>
      assertProviderPayload(
        { ...payload("planner"), evidence: [], labels: [], history: [] },
        null,
        SHARED_ROUTE,
      ),
    ).toThrow(ProviderPolicyViolation);
  });

  it("offers a non-sharing route only when verified with its own key", () => {
    expect(availableRoutes({})).toEqual([SHARED_ROUTE]);
    expect(
      availableRoutes({ ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED: "1" }),
    ).toEqual([SHARED_ROUTE]);
    expect(
      availableRoutes({
        ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED: "1",
        OPENAI_NON_SHARING_API_KEY: "k",
      }).map((r) => r.id),
    ).toEqual(["openai_shared", "openai_non_sharing"]);
  });
});

describe("capability manifest", () => {
  it("covers every capability the evaluation corpus needs", () => {
    const known = new Set([
      ...CAPABILITY_MANIFEST.map((item) => item.id),
      ...Object.keys(PROCESS_CAPABILITIES),
    ]);
    for (const capability of CORPUS_CAPABILITIES)
      expect(known, capability).toContain(capability);
    const ids = CAPABILITY_MANIFEST.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists every domain, including explicit unsupported entries", () => {
    const domains = new Set(CAPABILITY_MANIFEST.map((item) => item.domain));
    for (const domain of [
      "money",
      "debts",
      "tasks",
      "goals",
      "career",
      "reviews",
      "knowledge",
      "decisions",
      "signals",
      "graph",
      "history",
      "timeline",
    ])
      expect(domains, domain).toContain(domain);
    expect(
      CAPABILITY_MANIFEST.filter((item) => item.status === "unsupported").map(
        (item) => item.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "money.budget",
        "goal.history",
        "capture.provenance",
        "settings.preferences",
      ]),
    );
  });

  it("adjusts status for consent, route and outages", () => {
    const status = (
      id: string,
      options: Parameters<typeof analystCapabilities>[0],
    ) => analystCapabilities(options).find((item) => item.id === id)?.status;
    const everything: AnalystConsent = {
      ...consent,
      profiles: ["aggregate", "basic_context", "sensitive_narrative"],
    };
    expect(
      status("decision.text", { consent: everything, route: SHARED_ROUTE }),
    ).toBe("not_authorized");
    expect(
      status("decision.text", { consent: everything, route: verified }),
    ).toBe("available");
    expect(status("decision.context", { consent, route: SHARED_ROUTE })).toBe(
      "available",
    );
    expect(
      status("money.totals", {
        consent: { ...consent, domains: ["goals"] },
        route: SHARED_ROUTE,
      }),
    ).toBe("not_authorized");
    expect(status("goal.history", { consent: null, route: SHARED_ROUTE })).toBe(
      "unsupported",
    );
    expect(
      status("graph.paths", {
        consent,
        route: SHARED_ROUTE,
        unavailableTools: new Set([
          "getRelationshipPaths",
          "getRelatedEntities",
        ]),
      }),
    ).toBe("temporarily_unavailable");
    expect(
      analystCapabilities({
        consent,
        route: SHARED_ROUTE,
        domains: ["career"],
      }).every((item) => item.domain === "career"),
    ).toBe(true);
  });
});
