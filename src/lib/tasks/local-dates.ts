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
