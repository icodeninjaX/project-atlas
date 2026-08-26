import { formatCentavos } from "@/lib/money/money";

export const signalCategories = [
  "Money",
  "Debt",
  "Tasks",
  "Career",
  "Goals",
] as const;

export const signalSeverities = [
  "info",
  "positive",
  "warning",
  "critical",
] as const;

export type SignalCategory = (typeof signalCategories)[number];
export type SignalSeverity = (typeof signalSeverities)[number];

export type SignalType =
  | "money.spending-increase"
  | "money.budget-threshold"
  | "money.category-spike"
  | "debt.progress"
  | "debt.deadline"
  | "tasks.overdue-increase"
  | "tasks.strong-execution"
  | "tasks.workload-pressure"
  | "career.low-conversion"
  | "career.follow-up-backlog"
  | "career.positive-momentum"
  | "career.stalled"
  | "goals.stalled"
  | "goals.milestone-progress"
  | "goals.deadline";

export type Signal = {
  id: string;
  type: SignalType;
  category: SignalCategory;
  severity: SignalSeverity;
  title: string;
  message: string;
  reason: string;
  metric?: { label: string; value: string };
  comparison?: { label: string; value: string };
  href: string;
  generatedAt: string;
  sensitive: boolean;
};

export type SignalSourceData = {
  transactions: Array<{
    categoryId: string;
    amountCentavos: number;
    transactionDate: string;
  }>;
  categories: Array<{ id: string; name: string }>;
  currentBudget: null | {
    monthStart: string;
    plannedCentavos: number;
  };
  debts: Array<{
    id: string;
    creditorName: string;
    currentBalanceCentavos: number;
    nextDueDate: string | null;
    status: string;
    createdAt: string;
  }>;
  debtPayments: Array<{
    debtId: string;
    amountCentavos: number;
    paymentDate: string;
  }>;
  tasks: Array<{
    id: string;
    status: string;
    dueAt: string | null;
    scheduledFor: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
  applications: Array<{
    id: string;
    stage: string;
    appliedAt: string | null;
    nextActionAt: string | null;
    updatedAt: string;
  }>;
  applicationEvents: Array<{
    applicationId: string;
    eventType: string;
    occurredAt: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    targetDate: string | null;
    progressPercent: number;
    updatedAt: string;
  }>;
  milestones: Array<{
    id: string;
    goalId: string;
    completedAt: string | null;
    updatedAt: string;
  }>;
};

export type SignalDataWindow = {
  today: string;
  monthStart: string;
  nextMonthStart: string;
  historicalMonthStarts: [string, string, string];
  oldestTransactionDate: string;
  completedTaskLookbackIso: string;
  recentCareerIso: string;
};

const severityRank: Record<SignalSeverity, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  info: 3,
};

const typeRank: Record<SignalType, number> = {
  "debt.deadline": 0,
  "money.budget-threshold": 1,
  "tasks.overdue-increase": 2,
  "tasks.workload-pressure": 3,
  "career.follow-up-backlog": 4,
  "goals.deadline": 5,
  "money.spending-increase": 6,
  "money.category-spike": 7,
  "career.low-conversion": 8,
  "career.stalled": 9,
  "goals.stalled": 10,
  "debt.progress": 11,
  "tasks.strong-execution": 12,
  "career.positive-momentum": 13,
  "goals.milestone-progress": 14,
};

const terminalApplicationStages = new Set([
  "rejected",
  "withdrawn",
  "accepted",
]);

const interviewStages = new Set([
  "interview",
  "final_interview",
  "offer",
  "accepted",
]);

const interviewEventTypes = new Set([
  "stage_interview",
  "stage_final_interview",
  "stage_offer",
  "stage_accepted",
]);

function manilaIsoDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(value: string, months: number): string {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function manilaStartIso(value: string): string {
  return new Date(`${value}T00:00:00+08:00`).toISOString();
}

function dayDifference(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

function mondayStart(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const weekday = date.getUTCDay();
  return shiftDate(value, weekday === 0 ? -6 : 1 - weekday);
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function percentageChange(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

function percentageLabel(value: number): string {
  return `${Math.round(value)}%`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isBetween(value: string, start: string, end: string): boolean {
  return value >= start && value < end;
}

function baseSignal(
  signal: Omit<Signal, "generatedAt">,
  generatedAt: string,
): Signal {
  return { ...signal, generatedAt };
}

export function getSignalDataWindow(now: Date): SignalDataWindow {
  const today = manilaIsoDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const previousThree = [
    shiftMonth(monthStart, -3),
    shiftMonth(monthStart, -2),
    shiftMonth(monthStart, -1),
  ] as [string, string, string];
  const weekStart = mondayStart(today);

  return {
    today,
    monthStart,
    nextMonthStart: shiftMonth(monthStart, 1),
    historicalMonthStarts: previousThree,
    oldestTransactionDate: previousThree[0],
    completedTaskLookbackIso: manilaStartIso(shiftDate(weekStart, -21)),
    recentCareerIso: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
  };
}

function moneySignals(
  data: SignalSourceData,
  window: SignalDataWindow,
  generatedAt: string,
): Signal[] {
  const currentExpenses = sum(
    data.transactions
      .filter((transaction) =>
        isBetween(
          transaction.transactionDate,
          window.monthStart,
          window.nextMonthStart,
        ),
      )
      .map((transaction) => transaction.amountCentavos),
  );
  const historicalTotals = window.historicalMonthStarts.map((monthStart) => {
    const nextMonth = shiftMonth(monthStart, 1);
    return sum(
      data.transactions
        .filter((transaction) =>
          isBetween(transaction.transactionDate, monthStart, nextMonth),
        )
        .map((transaction) => transaction.amountCentavos),
    );
  });
  const hasThreeCompletedMonths = historicalTotals.every((total) => total > 0);
  const historicalAverage = Math.round(sum(historicalTotals) / 3);
  const spendingChange = percentageChange(currentExpenses, historicalAverage);
  const signals: Signal[] = [];

  if (
    hasThreeCompletedMonths &&
    historicalAverage >= 100_000 &&
    currentExpenses - historicalAverage >= 100_000 &&
    spendingChange !== null &&
    spendingChange >= 20
  ) {
    signals.push(
      baseSignal(
        {
          id: `money-spending-${window.monthStart}`,
          type: "money.spending-increase",
          category: "Money",
          severity: spendingChange >= 40 ? "warning" : "info",
          title: "Spending increased",
          message: `Expenses this month are ${spendingChange}% above your recent monthly average.`,
          reason: `Your current month's expenses are ${formatCentavos(currentExpenses)}. Your average across the previous three completed months was ${formatCentavos(historicalAverage)}.`,
          metric: {
            label: "This month",
            value: formatCentavos(currentExpenses),
          },
          comparison: {
            label: "Recent monthly average",
            value: formatCentavos(historicalAverage),
          },
          href: "/money/transactions",
          sensitive: true,
        },
        generatedAt,
      ),
    );
  }

  const budget = data.currentBudget;
  let budgetSignal: Signal | null = null;
  if (budget?.monthStart === window.monthStart && budget.plannedCentavos > 0) {
    const used = (currentExpenses / budget.plannedCentavos) * 100;
    if (used >= 75) {
      const severity: SignalSeverity =
        used >= 100 ? "critical" : used >= 90 ? "warning" : "info";
      const roundedUsed = Math.round(used);
      budgetSignal = baseSignal(
        {
          id: `money-budget-${window.monthStart}`,
          type: "money.budget-threshold",
          category: "Money",
          severity,
          title:
            severity === "critical"
              ? "Monthly budget reached"
              : "Budget limit approaching",
          message: `You've used ${roundedUsed}% of your monthly budget.`,
          reason: `You recorded ${formatCentavos(currentExpenses)} in expenses against a ${formatCentavos(budget.plannedCentavos)} monthly plan.`,
          metric: { label: "Budget used", value: `${roundedUsed}%` },
          comparison: {
            label: "Monthly plan",
            value: formatCentavos(budget.plannedCentavos),
          },
          href: "/money/budget",
          sensitive: true,
        },
        generatedAt,
      );
      signals.push(budgetSignal);
    }
  }

  const categoryNames = new Map(
    data.categories.map((category) => [category.id, category.name]),
  );
  const categoryIds = new Set(
    data.transactions.map((transaction) => transaction.categoryId),
  );
  const spikes = [...categoryIds]
    .map((categoryId) => {
      const current = sum(
        data.transactions
          .filter(
            (transaction) =>
              transaction.categoryId === categoryId &&
              isBetween(
                transaction.transactionDate,
                window.monthStart,
                window.nextMonthStart,
              ),
          )
          .map((transaction) => transaction.amountCentavos),
      );
      const history = window.historicalMonthStarts.map((monthStart) =>
        sum(
          data.transactions
            .filter(
              (transaction) =>
                transaction.categoryId === categoryId &&
                isBetween(
                  transaction.transactionDate,
                  monthStart,
                  shiftMonth(monthStart, 1),
                ),
            )
            .map((transaction) => transaction.amountCentavos),
        ),
      );
      const activeMonths = history.filter((value) => value > 0).length;
      const average = Math.round(sum(history) / 3);
      const change = percentageChange(current, average);
      return { categoryId, current, average, change, activeMonths };
    })
    .filter(
      (candidate) =>
        candidate.activeMonths >= 2 &&
        candidate.current >= 150_000 &&
        candidate.average >= 100_000 &&
        candidate.current - candidate.average >= 50_000 &&
        candidate.change !== null &&
        candidate.change >= 30,
    )
    .sort(
      (left, right) =>
        (right.change ?? 0) - (left.change ?? 0) ||
        right.current - left.current ||
        left.categoryId.localeCompare(right.categoryId),
    );
  const spike = spikes[0];
  if (spike?.change != null) {
    const categoryName = categoryNames.get(spike.categoryId) ?? "A category";
    signals.push(
      baseSignal(
        {
          id: `money-category-${spike.categoryId}-${window.monthStart}`,
          type: "money.category-spike",
          category: "Money",
          severity: spike.change >= 60 ? "warning" : "info",
          title: `${categoryName} spending spiked`,
          message: `${categoryName} spending is ${spike.change}% above your recent average.`,
          reason: `You spent ${formatCentavos(spike.current)} on ${categoryName} this month, compared with a three-month average of ${formatCentavos(spike.average)}.`,
          metric: {
            label: `${categoryName} this month`,
            value: formatCentavos(spike.current),
          },
          comparison: {
            label: "Recent average",
            value: formatCentavos(spike.average),
          },
          href: "/money/transactions",
          sensitive: true,
        },
        generatedAt,
      ),
    );
  }

  if (
    budgetSignal &&
    (budgetSignal.severity === "warning" ||
      budgetSignal.severity === "critical")
  ) {
    return signals.filter(
      (signal) => signal.type !== "money.spending-increase",
    );
  }

  return signals;
}

function debtSignals(
  data: SignalSourceData,
  window: SignalDataWindow,
  generatedAt: string,
): Signal[] {
  const signals: Signal[] = [];
  const monthStartIso = manilaStartIso(window.monthStart);
  const existingDebtIds = new Set(
    data.debts
      .filter((debt) => debt.createdAt < monthStartIso)
      .map((debt) => debt.id),
  );
  const currentTotal = sum(
    data.debts.map((debt) => debt.currentBalanceCentavos),
  );
  const existingCurrentTotal = sum(
    data.debts
      .filter((debt) => existingDebtIds.has(debt.id))
      .map((debt) => debt.currentBalanceCentavos),
  );
  const currentMonthPaymentsOnExistingDebt = sum(
    data.debtPayments
      .filter(
        (payment) =>
          existingDebtIds.has(payment.debtId) &&
          isBetween(
            payment.paymentDate,
            window.monthStart,
            window.nextMonthStart,
          ),
      )
      .map((payment) => payment.amountCentavos),
  );
  const monthStartTotal =
    existingCurrentTotal + currentMonthPaymentsOnExistingDebt;
  const decrease = monthStartTotal - currentTotal;

  if (
    monthStartTotal > 0 &&
    decrease >= 50_000 &&
    decrease / monthStartTotal >= 0.01
  ) {
    signals.push(
      baseSignal(
        {
          id: `debt-progress-${window.monthStart}`,
          type: "debt.progress",
          category: "Debt",
          severity: "positive",
          title: "Debt moving down",
          message: `You reduced your total debt by ${formatCentavos(decrease)} this month.`,
          reason: `Your remaining debt moved from ${formatCentavos(monthStartTotal)} at the start of the month to ${formatCentavos(currentTotal)} now. New debts created this month are included in the current total.`,
          metric: {
            label: "Reduced this month",
            value: formatCentavos(decrease),
          },
          comparison: {
            label: "Remaining now",
            value: formatCentavos(currentTotal),
          },
          href: "/debts",
          sensitive: true,
        },
        generatedAt,
      ),
    );
  }

  const deadline = data.debts
    .filter(
      (debt) =>
        debt.status === "active" &&
        debt.currentBalanceCentavos > 0 &&
        debt.nextDueDate !== null,
    )
    .map((debt) => ({
      ...debt,
      daysUntil: dayDifference(window.today, debt.nextDueDate as string),
    }))
    .filter((debt) => debt.daysUntil <= 7)
    .sort(
      (left, right) =>
        left.daysUntil - right.daysUntil ||
        left.creditorName.localeCompare(right.creditorName),
    )[0];

  if (deadline?.nextDueDate) {
    const overdue = deadline.daysUntil < 0;
    const severity: SignalSeverity = overdue
      ? "critical"
      : deadline.daysUntil === 0
        ? "critical"
        : deadline.daysUntil <= 3
          ? "warning"
          : "info";
    const timing = overdue
      ? `${Math.abs(deadline.daysUntil)} ${Math.abs(deadline.daysUntil) === 1 ? "day" : "days"} ago`
      : deadline.daysUntil === 0
        ? "today"
        : `in ${deadline.daysUntil} ${deadline.daysUntil === 1 ? "day" : "days"}`;

    signals.push(
      baseSignal(
        {
          id: `debt-deadline-${deadline.id}`,
          type: "debt.deadline",
          category: "Debt",
          severity,
          title: overdue
            ? `${deadline.creditorName} payment appears overdue`
            : `${deadline.creditorName} payment approaching`,
          message: `${deadline.creditorName}'s stored next payment date is ${timing}.`,
          reason: `This active debt has a remaining balance of ${formatCentavos(deadline.currentBalanceCentavos)} and its next due date is still ${dateLabel(deadline.nextDueDate)}.`,
          metric: { label: "Due", value: timing },
          comparison: {
            label: "Remaining balance",
            value: formatCentavos(deadline.currentBalanceCentavos),
          },
          href: `/debts/${deadline.id}`,
          sensitive: true,
        },
        generatedAt,
      ),
    );
  }

  return signals;
}

function taskDate(task: SignalSourceData["tasks"][number]): string | null {
  if (task.dueAt) return manilaIsoDate(task.dueAt);
  return task.scheduledFor;
}

function taskSignals(
  data: SignalSourceData,
  window: SignalDataWindow,
  now: Date,
  generatedAt: string,
): Signal[] {
  const activeTasks = data.tasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled",
  );
  const currentOverdue = activeTasks.filter((task) => {
    const dueDate = taskDate(task);
    return dueDate !== null && dueDate < window.today;
  }).length;
  const previousToday = shiftDate(window.today, -7);
  const previousSnapshot = new Date(now.getTime() - 7 * 86_400_000);
  const previousOverdue = data.tasks.filter((task) => {
    const dueDate = taskDate(task);
    if (
      !dueDate ||
      dueDate >= previousToday ||
      task.status === "cancelled" ||
      new Date(task.createdAt) > previousSnapshot
    ) {
      return false;
    }
    return !task.completedAt || new Date(task.completedAt) > previousSnapshot;
  }).length;
  const overdueDelta = currentOverdue - previousOverdue;
  let pressureSignal: Signal | null = null;

  if (currentOverdue >= 3 && overdueDelta >= 2) {
    pressureSignal = baseSignal(
      {
        id: `tasks-overdue-${window.today}`,
        type: "tasks.overdue-increase",
        category: "Tasks",
        severity: currentOverdue >= 8 || overdueDelta >= 5 ? "warning" : "info",
        title: "Overdue work increased",
        message: `You have ${currentOverdue} overdue tasks, up from ${previousOverdue} last week.`,
        reason: `ATLAS reconstructed last week's open tasks using each task's due or scheduled date, creation time, and completion time. The count increased by ${overdueDelta}.`,
        metric: { label: "Overdue now", value: String(currentOverdue) },
        comparison: {
          label: "Same time last week",
          value: String(previousOverdue),
        },
        href: "/tasks?view=overdue",
        sensitive: false,
      },
      generatedAt,
    );
  }

  const attentionTasks = activeTasks.filter((task) => {
    const dueDate = taskDate(task);
    return dueDate !== null && dueDate <= window.today;
  });
  const dueToday = attentionTasks.filter(
    (task) => taskDate(task) === window.today,
  ).length;
  if (attentionTasks.length >= 8 && dueToday >= 3) {
    const workloadSignal = baseSignal(
      {
        id: `tasks-workload-${window.today}`,
        type: "tasks.workload-pressure",
        category: "Tasks",
        severity: attentionTasks.length >= 12 ? "warning" : "info",
        title: "Due workload is concentrated",
        message: `You have ${attentionTasks.length} due or overdue tasks competing for attention today.`,
        reason: `${dueToday} are due today and ${attentionTasks.length - dueToday} were due earlier. Completed and cancelled tasks are excluded.`,
        metric: {
          label: "Due or overdue",
          value: String(attentionTasks.length),
        },
        comparison: { label: "Due today", value: String(dueToday) },
        href: "/tasks",
        sensitive: false,
      },
      generatedAt,
    );
    pressureSignal =
      rankSignals(
        pressureSignal ? [pressureSignal, workloadSignal] : [workloadSignal],
        1,
      )[0] ?? null;
  }

  const weekStart = mondayStart(window.today);
  const currentWeekStart = manilaStartIso(weekStart);
  const currentCompleted = data.tasks.filter(
    (task) =>
      task.completedAt !== null &&
      task.completedAt >= currentWeekStart &&
      new Date(task.completedAt) <= now,
  ).length;
  const previousWeekCounts = [1, 2, 3].map((weeksAgo) => {
    const start = shiftDate(weekStart, -7 * weeksAgo);
    const end = shiftDate(start, 7);
    const startIso = manilaStartIso(start);
    const endIso = manilaStartIso(end);
    return data.tasks.filter(
      (task) =>
        task.completedAt !== null &&
        task.completedAt >= startIso &&
        task.completedAt < endIso,
    ).length;
  });
  const previousCompletionTotal = sum(previousWeekCounts);
  const previousCompletionAverage = previousCompletionTotal / 3;
  const strongestPreviousWeek = Math.max(...previousWeekCounts);
  const signals = pressureSignal ? [pressureSignal] : [];

  if (
    currentCompleted >= 5 &&
    previousCompletionTotal >= 3 &&
    currentCompleted > strongestPreviousWeek &&
    currentCompleted >= Math.ceil(previousCompletionAverage * 1.25)
  ) {
    signals.push(
      baseSignal(
        {
          id: `tasks-execution-${weekStart}`,
          type: "tasks.strong-execution",
          category: "Tasks",
          severity: "positive",
          title: "Strong task execution",
          message: `You completed ${currentCompleted} tasks this week—your strongest week in the last month.`,
          reason: `Your previous three weekly completion totals were ${previousWeekCounts.join(", ")}. This week has already passed each of them.`,
          metric: {
            label: "Completed this week",
            value: String(currentCompleted),
          },
          comparison: {
            label: "Previous best",
            value: String(strongestPreviousWeek),
          },
          href: "/tasks?view=completed",
          sensitive: false,
        },
        generatedAt,
      ),
    );
  }

  return signals;
}

function careerSignals(
  data: SignalSourceData,
  window: SignalDataWindow,
  now: Date,
  generatedAt: string,
): Signal[] {
  const signals: Signal[] = [];
  const recentApplications = data.applications.filter(
    (application) =>
      application.appliedAt !== null &&
      application.appliedAt >= window.recentCareerIso &&
      new Date(application.appliedAt) <= now,
  );
  const interviewedApplicationIds = new Set(
    data.applicationEvents
      .filter((event) => interviewEventTypes.has(event.eventType))
      .map((event) => event.applicationId),
  );
  for (const application of data.applications) {
    if (interviewStages.has(application.stage)) {
      interviewedApplicationIds.add(application.id);
    }
  }
  const recentInterviews = recentApplications.filter((application) =>
    interviewedApplicationIds.has(application.id),
  ).length;
  const interviewsThisMonth = new Set(
    data.applicationEvents
      .filter(
        (event) =>
          interviewEventTypes.has(event.eventType) &&
          event.occurredAt >= manilaStartIso(window.monthStart) &&
          new Date(event.occurredAt) <= now,
      )
      .map((event) => event.applicationId),
  ).size;

  if (interviewsThisMonth >= 2) {
    signals.push(
      baseSignal(
        {
          id: `career-momentum-${window.monthStart}`,
          type: "career.positive-momentum",
          category: "Career",
          severity: "positive",
          title: "Applications are gaining momentum",
          message: `${interviewsThisMonth} applications progressed to an interview stage this month.`,
          reason: `ATLAS found ${interviewsThisMonth} distinct applications with an interview, final interview, offer, or acceptance stage event since ${dateLabel(window.monthStart)}.`,
          metric: {
            label: "Progressed this month",
            value: String(interviewsThisMonth),
          },
          href: "/career",
          sensitive: false,
        },
        generatedAt,
      ),
    );
  } else if (
    recentApplications.length >= 10 &&
    recentInterviews / recentApplications.length < 0.2
  ) {
    signals.push(
      baseSignal(
        {
          id: `career-conversion-${window.today}`,
          type: "career.low-conversion",
          category: "Career",
          severity: recentInterviews === 0 ? "warning" : "info",
          title: "Application response is low",
          message: `You submitted ${recentApplications.length} applications in the last 30 days, but only ${recentInterviews} ${recentInterviews === 1 ? "has" : "have"} progressed to an interview.`,
          reason: `The recent application-to-interview conversion is ${percentageLabel((recentInterviews / recentApplications.length) * 100)} across a sample of ${recentApplications.length} submitted applications.`,
          metric: {
            label: "Applications submitted",
            value: String(recentApplications.length),
          },
          comparison: {
            label: "Reached interview",
            value: String(recentInterviews),
          },
          href: "/career",
          sensitive: false,
        },
        generatedAt,
      ),
    );
  }

  const activeApplications = data.applications.filter(
    (application) => !terminalApplicationStages.has(application.stage),
  );
  const followUps = activeApplications.filter(
    (application) =>
      application.nextActionAt !== null &&
      new Date(application.nextActionAt) <= now,
  );
  if (followUps.length >= 3) {
    signals.push(
      baseSignal(
        {
          id: `career-follow-ups-${window.today}`,
          type: "career.follow-up-backlog",
          category: "Career",
          severity: followUps.length >= 5 ? "warning" : "info",
          title: "Career follow-ups waiting",
          message: `${followUps.length} active applications have a next action that is due.`,
          reason: `These applications are still active and their stored next-action times have passed. Terminal stages are excluded.`,
          metric: {
            label: "Follow-ups due",
            value: String(followUps.length),
          },
          href: "/career",
          sensitive: false,
        },
        generatedAt,
      ),
    );
  } else {
    const stalledCutoff = new Date(now.getTime() - 14 * 86_400_000);
    const stalled = activeApplications.filter(
      (application) => new Date(application.updatedAt) <= stalledCutoff,
    );
    if (stalled.length >= 3) {
      signals.push(
        baseSignal(
          {
            id: `career-stalled-${window.today}`,
            type: "career.stalled",
            category: "Career",
            severity: "info",
            title: "Applications have gone quiet",
            message: `${stalled.length} active applications have had no recorded movement for at least 14 days.`,
            reason: `ATLAS compared each active application's last updated time with a 14-day cutoff. Rejected, withdrawn, and accepted applications are excluded.`,
            metric: {
              label: "Without movement",
              value: String(stalled.length),
            },
            href: "/career",
            sensitive: false,
          },
          generatedAt,
        ),
      );
    }
  }

  return signals;
}

function goalSignals(
  data: SignalSourceData,
  window: SignalDataWindow,
  now: Date,
  generatedAt: string,
): Signal[] {
  const activeGoals = data.goals.filter((goal) => goal.status === "active");
  const milestonesByGoal = new Map<string, SignalSourceData["milestones"]>();
  for (const milestone of data.milestones) {
    const milestones = milestonesByGoal.get(milestone.goalId) ?? [];
    milestones.push(milestone);
    milestonesByGoal.set(milestone.goalId, milestones);
  }

  const completedThisMonth = activeGoals
    .map((goal) => ({
      goal,
      count: (milestonesByGoal.get(goal.id) ?? []).filter(
        (milestone) =>
          milestone.completedAt !== null &&
          milestone.completedAt >= manilaStartIso(window.monthStart) &&
          new Date(milestone.completedAt) <= now,
      ).length,
    }))
    .filter((item) => item.count >= 2)
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.goal.title.localeCompare(right.goal.title),
    )[0];
  const signals: Signal[] = [];

  if (completedThisMonth) {
    signals.push(
      baseSignal(
        {
          id: `goal-milestones-${completedThisMonth.goal.id}-${window.monthStart}`,
          type: "goals.milestone-progress",
          category: "Goals",
          severity: "positive",
          title: `Progress on “${completedThisMonth.goal.title}”`,
          message: `You completed ${completedThisMonth.count} milestones toward “${completedThisMonth.goal.title}” this month.`,
          reason: `ATLAS counted milestones for this active goal whose completion times fall within the current Manila calendar month.`,
          metric: {
            label: "Milestones completed",
            value: String(completedThisMonth.count),
          },
          href: `/goals?highlight=${completedThisMonth.goal.id}`,
          sensitive: false,
        },
        generatedAt,
      ),
    );
  }

  const deadlineCandidates = activeGoals
    .map((goal) => {
      const milestones = milestonesByGoal.get(goal.id) ?? [];
      const completeCount = milestones.filter(
        (milestone) => milestone.completedAt,
      ).length;
      const calculatedProgress = milestones.length
        ? Math.round((completeCount / milestones.length) * 100)
        : goal.progressPercent;
      return {
        goal,
        progress: calculatedProgress,
        daysUntil: goal.targetDate
          ? dayDifference(window.today, goal.targetDate)
          : null,
      };
    })
    .filter(
      (candidate) =>
        candidate.goal.targetDate !== null &&
        candidate.progress < 100 &&
        candidate.daysUntil !== null &&
        candidate.daysUntil <= 14,
    )
    .sort(
      (left, right) =>
        (left.daysUntil ?? 999) - (right.daysUntil ?? 999) ||
        left.goal.title.localeCompare(right.goal.title),
    );
  const deadline = deadlineCandidates[0];

  if (deadline?.goal.targetDate && deadline.daysUntil !== null) {
    const overdue = deadline.daysUntil < 0;
    const severity: SignalSeverity = overdue
      ? "critical"
      : deadline.daysUntil <= 7
        ? "warning"
        : "info";
    const timing = overdue
      ? `${Math.abs(deadline.daysUntil)} ${Math.abs(deadline.daysUntil) === 1 ? "day" : "days"} overdue`
      : deadline.daysUntil === 0
        ? "due today"
        : `due in ${deadline.daysUntil} ${deadline.daysUntil === 1 ? "day" : "days"}`;
    signals.push(
      baseSignal(
        {
          id: `goal-deadline-${deadline.goal.id}`,
          type: "goals.deadline",
          category: "Goals",
          severity,
          title: overdue ? "Goal deadline passed" : "Goal deadline approaching",
          message: `“${deadline.goal.title}” is ${timing} with ${deadline.progress}% of its milestones complete.`,
          reason: `The stored target date is ${dateLabel(deadline.goal.targetDate)} and the current milestone-derived progress is ${deadline.progress}%.`,
          metric: { label: "Progress", value: `${deadline.progress}%` },
          comparison: {
            label: "Target",
            value: dateLabel(deadline.goal.targetDate),
          },
          href: `/goals?highlight=${deadline.goal.id}`,
          sensitive: false,
        },
        generatedAt,
      ),
    );
  }

  const deadlineGoalIds = new Set(
    deadlineCandidates.map((candidate) => candidate.goal.id),
  );
  const stalled = activeGoals
    .filter((goal) => !deadlineGoalIds.has(goal.id))
    .map((goal) => {
      const milestones = milestonesByGoal.get(goal.id) ?? [];
      const latestUpdate = [
        goal.updatedAt,
        ...milestones.map((milestone) => milestone.updatedAt),
      ]
        .sort()
        .at(-1) as string;
      const inactiveDays = Math.floor(
        (now.getTime() - new Date(latestUpdate).getTime()) / 86_400_000,
      );
      return { goal, inactiveDays, latestUpdate };
    })
    .filter((candidate) => candidate.inactiveDays >= 21)
    .sort(
      (left, right) =>
        right.inactiveDays - left.inactiveDays ||
        left.goal.title.localeCompare(right.goal.title),
    )[0];

  if (stalled) {
    signals.push(
      baseSignal(
        {
          id: `goal-stalled-${stalled.goal.id}`,
          type: "goals.stalled",
          category: "Goals",
          severity: stalled.inactiveDays >= 45 ? "warning" : "info",
          title: `“${stalled.goal.title}” has gone quiet`,
          message: `This goal has had no recorded change for ${stalled.inactiveDays} days.`,
          reason: `ATLAS checked the goal and all of its milestones. The most recent stored update was ${new Date(stalled.latestUpdate).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}.`,
          metric: {
            label: "Days without change",
            value: String(stalled.inactiveDays),
          },
          href: `/goals?highlight=${stalled.goal.id}`,
          sensitive: false,
        },
        generatedAt,
      ),
    );
  }

  return signals;
}

export function rankSignals(signals: Signal[], limit = 20): Signal[] {
  const ranked = [...signals].sort(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      typeRank[left.type] - typeRank[right.type] ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
  const seen = new Set<string>();
  const deduplicated: Signal[] = [];
  for (const signal of ranked) {
    if (seen.has(signal.id)) continue;
    seen.add(signal.id);
    deduplicated.push(signal);
    if (deduplicated.length === limit) break;
  }
  return deduplicated;
}

export function selectDashboardSignals(signals: Signal[], limit = 5): Signal[] {
  const categoryCounts = new Map<SignalCategory, number>();
  const selected: Signal[] = [];
  for (const signal of rankSignals(signals)) {
    if ((categoryCounts.get(signal.category) ?? 0) >= 2) continue;
    selected.push(signal);
    categoryCounts.set(
      signal.category,
      (categoryCounts.get(signal.category) ?? 0) + 1,
    );
    if (selected.length === limit) break;
  }
  return selected;
}

export function generateSignals(
  data: SignalSourceData,
  now = new Date(),
): Signal[] {
  const window = getSignalDataWindow(now);
  const generatedAt = now.toISOString();
  return rankSignals([
    ...moneySignals(data, window, generatedAt),
    ...debtSignals(data, window, generatedAt),
    ...taskSignals(data, window, now, generatedAt),
    ...careerSignals(data, window, now, generatedAt),
    ...goalSignals(data, window, now, generatedAt),
  ]);
}
