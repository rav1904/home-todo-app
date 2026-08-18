import { isoHasExplicitTime } from "@/lib/tasks/due-datetime";

export function startOfLocalDay(date: Date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfLocalDay(date: Date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toLocalDayKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Calendar grouping key for a due_at ISO timestamp.
 * - Canonical date-only (…T00:00:00.000Z): use the YYYY-MM-DD prefix (selected date).
 * - Timed / legacy local-midnight: use the environment's local calendar date.
 * Prefer calling this in the browser so legacy date-only tasks land on the user's day.
 */
export function dueAtToCalendarDayKey(dueAt: string) {
  const canonical = dueAt.match(
    /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d{1,3})?Z$/i,
  );
  if (canonical) {
    return canonical[1];
  }

  return toLocalDayKey(dueAt);
}

/** Widen a fetch window so timezone-shifted dues are not dropped before client grouping. */
export function expandRangeForTimezoneSkew(start: Date, end: Date) {
  return {
    start: addDays(start, -1),
    end: addDays(end, 1),
  };
}

export function parseMonthParam(
  param: string | undefined,
  now = new Date(),
): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [yearPart, monthPart] = param.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart) - 1;

    if (month >= 0 && month <= 11) {
      return { year, month };
    }
  }

  return { year: now.getFullYear(), month: now.getMonth() };
}

export function formatMonthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function getMonthBounds(year: number, month: number) {
  return {
    start: startOfLocalDay(new Date(year, month, 1)),
    end: endOfLocalDay(new Date(year, month + 1, 0)),
  };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isSameLocalDay(
  left: Date | string,
  right: Date | string = new Date(),
) {
  return toLocalDayKey(left) === toLocalDayKey(right);
}

export function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatShortWeekday(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDayNumber(date: Date) {
  return date.getDate();
}

export function formatTaskTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Time label for calendar chips; empty for date-only dues. */
export function formatTaskTimeLabel(value: string) {
  if (!isoHasExplicitTime(value)) {
    return null;
  }
  return formatTaskTime(value);
}

export function parseDateParam(
  param: string | undefined,
  now = new Date(),
): string {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [yearPart, monthPart, dayPart] = param.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return toLocalDayKey(date);
      }
    }
  }

  return toLocalDayKey(now);
}

export function formatDateParam(date: Date) {
  return toLocalDayKey(date);
}

export function localDayKeyToDate(dayKey: string) {
  const [yearPart, monthPart, dayPart] = dayKey.split("-").map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
}

export function getDayBounds(dayKey: string) {
  const date = localDayKeyToDate(dayKey);
  return {
    start: startOfLocalDay(date),
    end: endOfLocalDay(date),
  };
}

export function getWeekStartDayKey(dayKey: string) {
  const date = localDayKeyToDate(dayKey);
  const mondayOffset = (date.getDay() + 6) % 7;
  return toLocalDayKey(addDays(date, -mondayOffset));
}

export function getWeekBounds(dayKey: string) {
  const weekStartKey = getWeekStartDayKey(dayKey);
  const weekStart = localDayKeyToDate(weekStartKey);
  const weekEnd = addDays(weekStart, 6);

  return {
    start: startOfLocalDay(weekStart),
    end: endOfLocalDay(weekEnd),
    weekStartKey,
  };
}

export function shiftDayKey(dayKey: string, delta: number) {
  return toLocalDayKey(addDays(localDayKeyToDate(dayKey), delta));
}

export function formatDayLabel(dayKey: string) {
  return localDayKeyToDate(dayKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatWeekLabel(weekStartDayKey: string) {
  const weekStart = localDayKeyToDate(weekStartDayKey);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

  const startLabel = weekStart.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function formatShortDayLabel(dayKey: string) {
  return localDayKeyToDate(dayKey).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const LIST_UPCOMING_DAYS = 90;

export function getListFetchBounds(now = new Date()) {
  const todayStart = startOfLocalDay(now);
  const upcomingEnd = endOfLocalDay(addDays(todayStart, LIST_UPCOMING_DAYS));

  return {
    todayStart,
    upcomingEnd,
  };
}
