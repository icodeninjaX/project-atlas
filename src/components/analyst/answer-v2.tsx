import { ClaimText } from "@/components/analyst/evidence-display";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { claimCanShip } from "@/lib/analyst/intelligence/claims";
import type {
  AnalysisBrief,
  AnswerV2,
  DerivedFact,
  EvidenceV2,
  ResultStatus,
  UnresolvedReason,
} from "@/lib/analyst/intelligence/contracts";
import { formatCentavos } from "@/lib/money/money";

/**
 * Minimal renderer for a validated AnswerV2 (AI-01), used behind the
 * `ATLAS_ANALYST_V2` flag to inspect fixture answers. It shows only claims
 * that passed checking; table values are rendered by ATLAS from the cited
 * evidence, never from model text.
 */

const statusLabel: Record<ResultStatus, string> = {
  answered: "Answered",
  partial_answer: "Partial answer",
  clarification_required: "Needs clarification",
  insufficient_evidence: "Not enough evidence",
  unsupported_capability: "Not supported yet",
  fallback_facts: "Facts only",
  error: "Unavailable",
};

const reasonLabel: Record<UnresolvedReason, string> = {
  no_supported_claim: "No checked statement answered this.",
  claim_rejected: "The statement for this failed ATLAS checks.",
  insufficient_evidence: "ATLAS does not have enough records for this.",
  unsupported_capability: "ATLAS cannot calculate this yet.",
  excluded_by_consent: "This uses data you chose not to share.",
  operational_failure: "ATLAS could not finish this part.",
};

function renderValue(value: number, unit: string) {
  if (unit === "centavos") return formatCentavos(value);
  if (unit === "percent") return `${value}%`;
  return String(value);
}

export function AnswerV2View({
  answer,
  brief,
  evidence,
  derived,
}: {
  answer: AnswerV2;
  brief: AnalysisBrief;
  evidence: EvidenceV2[];
  derived: DerivedFact[];
}) {
  const shipped = new Map(
    answer.claims.filter(claimCanShip).map((claim) => [claim.id, claim]),
  );
  const direct = answer.directAnswerClaimIds.flatMap(
    (id) => shipped.get(id) ?? [],
  );
  const shown = new Set([
    ...direct.map((claim) => claim.id),
    ...answer.sections.flatMap((section) => section.claimIds),
  ]);
  const remaining = [...shipped.values()].filter(
    (claim) => !shown.has(claim.id),
  );
  const cell = (ref: string) => {
    const item = evidence.find((entry) => entry.id === ref);
    if (item && (item.kind === "metric" || item.kind === "scenario_output"))
      return renderValue(item.value, item.unit);
    const fact = derived.find((entry) => entry.id === ref);
    if (fact?.output.status === "defined")
      return renderValue(fact.output.value, fact.output.unit);
    return "Not available";
  };
  const requirement = (id: string) =>
    brief.requirements.find((item) => item.id === id)?.question ?? id;
  const interpretive = [...shipped.values()].some(
    (claim) => claim.verification.semantic === "pending",
  );

  return (
    <article className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-2xl border p-4 text-sm">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {statusLabel[answer.status]}
      </p>
      {direct.length > 0 && (
        <div className="flex flex-col gap-2 text-base leading-7">
          {direct.map((claim) => (
            <p key={claim.id}>
              <ClaimText text={claim.text} />
            </p>
          ))}
        </div>
      )}
      {answer.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-1.5">
          <h3 className="font-semibold">{section.heading}</h3>
          {section.claimIds.flatMap((id) => {
            const claim = shipped.get(id);
            return claim && !direct.includes(claim)
              ? [
                  <p key={id} className="leading-6">
                    <ClaimText text={claim.text} />
                  </p>,
                ]
              : [];
          })}
        </section>
      ))}
      {remaining.length > 0 && (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-6">
          {remaining.map((claim) => (
            <li key={claim.id}>
              <ClaimText text={claim.text} />
            </li>
          ))}
        </ul>
      )}
      {answer.table && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="text-muted-foreground mb-2 text-left">
              <ClaimText
                text={shipped.get(answer.table.captionClaimId)?.text ?? ""}
              />
            </caption>
            <thead>
              <tr>
                {answer.table.columns.map((column) => (
                  <th
                    key={column}
                    className="border-border border-b py-1.5 pr-3 font-semibold"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answer.table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((entry, index) => (
                    <td
                      key={index}
                      className="border-border border-b py-1.5 pr-3 break-words"
                    >
                      {"ref" in entry ? (
                        <SensitiveValue>{cell(entry.ref)}</SensitiveValue>
                      ) : (
                        entry.label
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {answer.unresolved.length > 0 && (
        <section className="rounded-xl bg-amber-500/10 p-3">
          <h3 className="font-semibold">Not answered</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {answer.unresolved.map((item) => (
              <li key={item.requirementId}>
                {requirement(item.requirementId)} — {reasonLabel[item.reason]}
              </li>
            ))}
          </ul>
        </section>
      )}
      {answer.limitations.length > 0 && (
        <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
          {answer.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">
        {answer.verification.claimsPassed} of{" "}
        {answer.verification.claimsProposed} statements passed ATLAS figure,
        date and scope checks.
        {interpretive && " Interpretations have not had a separate review yet."}
      </p>
      {answer.sources.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Sources:{" "}
          {[...new Set(answer.sources.map((source) => source.href))].map(
            (href, index) => (
              <a
                key={href}
                href={href}
                className="underline underline-offset-2"
              >
                {index > 0 ? ", " : ""}
                {href}
              </a>
            ),
          )}
        </p>
      )}
    </article>
  );
}
