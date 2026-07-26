import { z } from "zod";

const optionalText = z.preprocess(
  (value) => value ?? undefined,
  z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
);

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(120),
  accountType: z.enum([
    "cash",
    "bank",
    "e_wallet",
    "savings",
    "investment",
    "other",
  ]),
  institution: optionalText,
  openingBalanceCentavos: z.number().int(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: optionalText,
  status: z
    .enum(["inbox", "planned", "in_progress", "completed", "cancelled"])
    .default("inbox"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueAt: z.iso.datetime().optional(),
  scheduledFor: z.iso.date().optional(),
  estimatedMinutes: z.number().int().positive().max(1_440).optional(),
  relatedGoalId: z.uuid().optional(),
});

export const transactionSchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid(),
  type: z.enum(["income", "expense"]),
  amountCentavos: z.number().int().positive(),
  transactionDate: z.iso.date(),
  merchantOrSource: optionalText,
  description: optionalText,
});

export const debtSchema = z.object({
  creditorName: z.string().trim().min(1).max(160),
  debtType: z.enum([
    "online_lending",
    "credit_card",
    "personal_loan",
    "family",
    "installment",
    "other",
  ]),
  originalBalanceCentavos: z.number().int().positive(),
  interestRatePercent: z.number().min(0).max(1_000),
  minimumPaymentCentavos: z.number().int().min(0),
  dueDay: z.number().int().min(1).max(31).optional(),
  nextDueDate: z.iso.date().optional(),
  status: z.enum(["active", "paid", "paused", "defaulted"]).default("active"),
  priority: z.number().int().positive(),
  notes: optionalText,
});

export const debtPaymentSchema = z.object({
  debtId: z.uuid(),
  amountCentavos: z.number().int().positive(),
  paymentDate: z.iso.date(),
  notes: optionalText,
});

export const authSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  currentCashCentavos: z.number().int().min(0).default(0),
  monthlyNetIncomeCentavos: z.number().int().min(0).default(0),
  nextPayday: z.iso.date().optional(),
  goals: z.array(z.string().trim().min(1).max(160)).max(3).default([]),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: optionalText,
  area: z.enum([
    "finance",
    "career",
    "health",
    "relationship",
    "family",
    "business",
    "learning",
    "personal",
  ]),
  status: z
    .enum(["active", "paused", "completed", "abandoned"])
    .default("active"),
  targetDate: z.iso.date().optional(),
  progressPercent: z.number().int().min(0).max(100).default(0),
  successDefinition: optionalText,
});

export const jobApplicationSchema = z
  .object({
    companyName: z.string().trim().min(1).max(160),
    roleTitle: z.string().trim().min(1).max(160),
    jobUrl: z.url().optional(),
    location: optionalText,
    workSetup: z
      .enum(["remote", "hybrid", "onsite", "unspecified"])
      .default("unspecified"),
    employmentType: z
      .enum([
        "full_time",
        "part_time",
        "contract",
        "freelance",
        "internship",
        "unspecified",
      ])
      .default("unspecified"),
    salaryMinCentavos: z.number().int().min(0).optional(),
    salaryMaxCentavos: z.number().int().min(0).optional(),
    stage: z
      .enum([
        "interested",
        "preparing",
        "applied",
        "assessment",
        "interview",
        "final_interview",
        "offer",
        "rejected",
        "withdrawn",
        "accepted",
      ])
      .default("interested"),
    appliedAt: z.iso.datetime().optional(),
    nextAction: optionalText,
    nextActionAt: z.iso.datetime().optional(),
    resumeVersion: optionalText,
    notes: optionalText,
  })
  .refine(
    (value) =>
      value.salaryMinCentavos == null ||
      value.salaryMaxCentavos == null ||
      value.salaryMaxCentavos >= value.salaryMinCentavos,
    {
      message: "Maximum salary must be at least the minimum",
      path: ["salaryMaxCentavos"],
    },
  );

const reviewScore = z.number().int().min(1).max(10).optional();
export const weeklyReviewSchema = z.object({
  weekStart: z.iso.date(),
  wins: optionalText,
  challenges: optionalText,
  lessons: optionalText,
  timeWasters: optionalText,
  moneyReflection: optionalText,
  careerReflection: optionalText,
  nextWeekFocus: optionalText,
  energyScore: reviewScore,
  stressScore: reviewScore,
  overallScore: reviewScore,
  submitted: z.boolean().default(false),
});

export const monthlyBudgetSchema = z
  .object({
    monthStart: z.iso.date(),
    expectedIncomeCentavos: z.number().int().min(0),
    notes: optionalText,
    items: z.array(
      z.object({
        categoryId: z.uuid(),
        plannedCentavos: z.number().int().min(0),
      }),
    ),
  })
  .refine((value) => value.monthStart.endsWith("-01"), {
    message: "Budget month must start on the first day",
    path: ["monthStart"],
  });

export type TaskInput = z.infer<typeof taskSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
