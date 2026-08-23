export type ReminderCounts = {
  tasks: number;
  debts: number;
  payday: boolean;
  review: boolean;
};

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function isInQuietHours(
  currentTime: string,
  quietStart: string,
  quietEnd: string,
) {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietStart);
  const end = timeToMinutes(quietEnd);
  if (start === end) return false;
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function buildDigestBody(counts: ReminderCounts) {
  const parts: string[] = [];
  if (counts.tasks) {
    parts.push(`${counts.tasks} task${counts.tasks === 1 ? "" : "s"} due`);
  }
  if (counts.debts) {
    parts.push(
      `${counts.debts} debt payment${counts.debts === 1 ? "" : "s"} due soon`,
    );
  }
  if (counts.payday) parts.push("Payday today");
  if (counts.review) parts.push("Weekly review ready");
  return parts.join(" · ");
}
