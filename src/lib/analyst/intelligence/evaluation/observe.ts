import { claimCanShip } from "../claims";
import type { AnswerV2 } from "../contracts";
import type { ObservedRun } from "./scoring";

/**
 * Normalizes an AnswerV2 into the scorer's ObservedRun, so the V2 path and the
 * legacy path are scored by the same code on the same cases.
 */
export function observeAnswerV2(
  caseId: string,
  answer: AnswerV2,
  run: Pick<
    ObservedRun,
    "facts" | "toolCalls" | "modelCalls" | "ownerIdsTouched"
  >,
): ObservedRun {
  const shipped = answer.claims.filter(claimCanShip);
  return {
    caseId,
    implementation: "v2",
    model: answer.model,
    status: answer.status,
    text: shipped.map((claim) => claim.text).join(" "),
    claims: answer.claims.map((claim) => ({
      text: claim.text,
      requirementIds:
        claim.kind === "limitation" ? [] : claim.answersRequirementIds,
      verified: claimCanShip(claim),
    })),
    unresolvedRequirementIds: answer.unresolved.map(
      (item) => item.requirementId,
    ),
    ...run,
  };
}
