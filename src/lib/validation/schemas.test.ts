import { describe, expect, it } from "vitest";
import {
  accountSchema,
  debtSchema,
  debtPaymentSchema,
  goalSchema,
  jobApplicationSchema,
  monthlyBudgetSchema,
  onboardingSchema,
  taskSchema,
  transactionSchema,
  weeklyReviewSchema,
} from "./schemas";

describe("shared validation schemas", () => {
  it("rejects unsupported financial account types", () => {
    const result = accountSchema.safeParse({
      name: "Primary",
      accountType: "crypto",
      openingBalanceCentavos: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an expense with a non-positive amount", () => {
    const result = transactionSchema.safeParse({
      accountId: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      categoryId: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
      type: "expense",
      amountCentavos: 0,
      transactionDate: "2026-07-26",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a debt due day outside a calendar month", () => {
    const result = debtSchema.safeParse({
      creditorName: "Sample lender",
      debtType: "personal_loan",
      originalBalanceCentavos: 100_000,
      interestRatePercent: 12,
      minimumPaymentCentavos: 10_000,
      dueDay: 32,
      status: "active",
      priority: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a zero debt payment", () => {
    expect(
      debtPaymentSchema.safeParse({
        debtId: "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
        amountCentavos: 0,
        paymentDate: "2026-07-26",
      }).success,
    ).toBe(false);
  });

  it("normalizes an empty task description to undefined", () => {
    const result = taskSchema.parse({
      title: "Prepare portfolio",
      description: "",
      status: "inbox",
      priority: "high",
    });

    expect(result.description).toBeUndefined();
  });

  it("normalizes a missing FormData task description to undefined", () => {
    const result = taskSchema.parse({
      title: "Apply for a job",
      description: null,
      status: "planned",
      priority: "high",
      scheduledFor: "2026-07-26",
    });

    expect(result.description).toBeUndefined();
  });

  it("accepts an exact task time when a scheduled date is present", () => {
    const result = taskSchema.safeParse({
      title: "Deep work",
      status: "planned",
      priority: "high",
      scheduledFor: "2026-08-14",
      scheduledTime: "09:30",
      estimatedMinutes: 50,
    });

    expect(result.success).toBe(true);
  });

  it("requires a scheduled date when an exact task time is present", () => {
    const result = taskSchema.safeParse({
      title: "Deep work",
      status: "planned",
      priority: "high",
      scheduledTime: "09:30",
    });

    expect(result.success).toBe(false);
  });

  it("accepts supported task energy and rejects unknown values", () => {
    expect(
      taskSchema.safeParse({
        title: "Write architecture notes",
        status: "planned",
        priority: "high",
        energyRequired: "high",
      }).success,
    ).toBe(true);
    expect(
      taskSchema.safeParse({
        title: "Write architecture notes",
        status: "planned",
        priority: "high",
        energyRequired: "extreme",
      }).success,
    ).toBe(false);
  });

  it("keeps onboarding balances as integer centavos", () => {
    const result = onboardingSchema.safeParse({
      displayName: "ATLAS user",
      currentCashCentavos: 250_000,
      monthlyNetIncomeCentavos: 1_900_000,
      nextPayday: "2026-07-31",
      goals: ["Build a stronger portfolio"],
    });

    expect(result.success).toBe(true);
  });

  it("keeps manual progress out of editable goal data", () => {
    const result = goalSchema.parse({
      title: "Ship portfolio",
      area: "career",
      status: "active",
      progressPercent: 101,
    });

    expect(result).not.toHaveProperty("progressPercent");
  });

  it("rejects a job salary range whose maximum is below its minimum", () => {
    expect(
      jobApplicationSchema.safeParse({
        companyName: "Sample company",
        roleTitle: "Developer",
        workSetup: "remote",
        employmentType: "full_time",
        stage: "interested",
        salaryMinCentavos: 5_000_000,
        salaryMaxCentavos: 4_000_000,
      }).success,
    ).toBe(false);
  });

  it("rejects weekly review scores outside 1 to 10", () => {
    expect(
      weeklyReviewSchema.safeParse({
        weekStart: "2026-07-20",
        energyScore: 11,
      }).success,
    ).toBe(false);
  });

  it("requires a monthly budget date to be the first day of its month", () => {
    expect(
      monthlyBudgetSchema.safeParse({
        monthStart: "2026-07-02",
        expectedIncomeCentavos: 1_900_000,
        items: [],
      }).success,
    ).toBe(false);
  });
});
