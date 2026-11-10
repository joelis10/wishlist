export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function isRecurrence(value: unknown): value is Recurrence {
  return value === "none" || value === "weekly" || value === "monthly" || value === "yearly";
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function localYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function splitYmd(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map(Number);
  return [y, m, d];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = splitYmd(ymd);
  return localYmd(new Date(y, m - 1, d + days));
}

function addMonthsClamped(ymd: string, months: number): string {
  const [y, m, d] = splitYmd(ymd);
  const target = new Date(y, m - 1 + months, 1);
  const day = Math.min(d, daysInMonth(target.getFullYear(), target.getMonth() + 1));
  return localYmd(new Date(target.getFullYear(), target.getMonth(), day));
}

function addYearsClamped(ymd: string, years: number): string {
  const [y, m, d] = splitYmd(ymd);
  const day = Math.min(d, daysInMonth(y + years, m));
  return localYmd(new Date(y + years, m - 1, day));
}

/** Returns the next date that matters (today or later for recurring dates). */
export function nextOccurrence(
  endDate: string | null,
  recurrence: Recurrence,
  now = new Date(),
): string | null {
  if (!endDate || !isValidDateOnly(endDate)) return null;
  const today = localYmd(now);
  if (recurrence === "none") return endDate;
  if (endDate >= today) return endDate;

  if (recurrence === "weekly") {
    const [ey, em, ed] = splitYmd(endDate);
    const [ty, tm, td] = splitYmd(today);
    const elapsed = Math.floor(
      (Date.UTC(ty, tm - 1, td) - Date.UTC(ey, em - 1, ed)) / 86_400_000,
    );
    return addDays(endDate, Math.ceil(elapsed / 7) * 7);
  }

  if (recurrence === "monthly") {
    const [ey, em] = splitYmd(endDate);
    const [ty, tm] = splitYmd(today);
    let months = (ty - ey) * 12 + (tm - em);
    let candidate = addMonthsClamped(endDate, months);
    while (candidate < today) {
      months += 1;
      candidate = addMonthsClamped(endDate, months);
    }
    return candidate;
  }

  const [ey] = splitYmd(endDate);
  const [ty] = splitYmd(today);
  let years = ty - ey;
  let candidate = addYearsClamped(endDate, years);
  while (candidate < today) {
    years += 1;
    candidate = addYearsClamped(endDate, years);
  }
  return candidate;
}

export function formatDate(ymd: string): string {
  if (!isValidDateOnly(ymd)) return ymd;
  const [y, m, d] = splitYmd(ymd);
  const now = new Date();
  const sameYear = y === now.getFullYear();
  return `${d} ${MONTHS[m - 1]}${sameYear ? "" : ` ${y}`}`;
}

export function relativeDate(ymd: string, now = new Date()): string {
  if (!isValidDateOnly(ymd)) return "";
  const [y, m, d] = splitYmd(ymd);
  const [ty, tm, td] = splitYmd(localYmd(now));
  const diffDays = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000,
  );
  const abs = Math.abs(diffDays);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (abs < 14) return diffDays > 0 ? `in ${abs} days` : `${abs} days ago`;
  if (abs < 60) {
    const weeks = Math.round(abs / 7);
    return diffDays > 0 ? `in ${weeks} weeks` : `${weeks} weeks ago`;
  }
  if (abs < 365) {
    const months = Math.round(abs / 30);
    return diffDays > 0 ? `in ${months} months` : `${months} months ago`;
  }
  const years = Math.round(abs / 365);
  return diffDays > 0 ? `in ${years} years` : `${years} years ago`;
}

export function endDateLabel(
  endDate: string | null,
  recurrence: Recurrence,
  now = new Date(),
): { date: string; relative: string; recurrence: Recurrence } | null {
  const next = nextOccurrence(endDate, recurrence, now);
  if (!next) return null;
  return {
    date: formatDate(next),
    relative: relativeDate(next, now),
    recurrence,
  };
}
