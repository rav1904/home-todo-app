export const DUE_TIME_MINUTE_STEP = 5;

/** Date-only dues are stored as UTC midnight of the selected calendar date. */
const DATE_ONLY_UTC_SUFFIX = "T00:00:00.000Z";
const DATE_ONLY_UTC_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d{1,3})?Z$/i;

export function generateDueTimeOptions(
  step = DUE_TIME_MINUTE_STEP,
): string[] {
  const options: string[] = [];

  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += step) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    options.push(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    );
  }

  return options;
}

export function normalizeLocalTimeString(
  time: string,
  step = DUE_TIME_MINUTE_STEP,
): string {
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "00:00";
  }

  let totalMinutes = hours * 60 + minutes;
  totalMinutes = Math.round(totalMinutes / step) * step;

  if (totalMinutes >= 24 * 60) {
    totalMinutes = 24 * 60 - step;
  }

  if (totalMinutes < 0) {
    totalMinutes = 0;
  }

  const normalizedHours = Math.floor(totalMinutes / 60);
  const normalizedMinutes = totalMinutes % 60;

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

export function splitDatetimeLocalValue(value: string): {
  date: string;
  time: string;
} | null {
  if (!value) {
    return null;
  }

  const datetimeMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (datetimeMatch) {
    return {
      date: datetimeMatch[1],
      time: normalizeLocalTimeString(datetimeMatch[2]),
    };
  }

  const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    return {
      date: dateMatch[1],
      time: "",
    };
  }

  return null;
}

export function joinDatetimeLocalValue(date: string, time: string): string {
  return `${date}T${normalizeLocalTimeString(time || "00:00")}`;
}

/** True when local time is set to something other than midnight (date-only convention). */
export function datetimeLocalHasExplicitTime(value: string): boolean {
  const parts = splitDatetimeLocalValue(value);
  if (!parts?.time) {
    return false;
  }

  return parts.time !== "00:00";
}

/** Stored as UTC midnight of the chosen YYYY-MM-DD (date-only, no wall-clock time). */
export function isCanonicalDateOnlyDueAt(
  iso: string | null | undefined,
): boolean {
  if (!iso) {
    return false;
  }

  return DATE_ONLY_UTC_PATTERN.test(iso);
}

/**
 * True when the due timestamp represents an explicit wall-clock time.
 * Canonical date-only and legacy local-midnight values are treated as date-only.
 */
export function isoHasExplicitTime(iso: string | null | undefined): boolean {
  if (!iso) {
    return false;
  }

  if (isCanonicalDateOnlyDueAt(iso)) {
    return false;
  }

  const date = new Date(iso);
  return (
    date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
  );
}

export function dateOnlyDayKeyToIso(dayKey: string): string {
  return `${dayKey}${DATE_ONLY_UTC_SUFFIX}`;
}

export function normalizeDatetimeLocalValue(value: string): string {
  const parts = splitDatetimeLocalValue(value);
  if (!parts) {
    return "";
  }

  return joinDatetimeLocalValue(parts.date, parts.time);
}

export function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }

  if (isCanonicalDateOnlyDueAt(iso)) {
    const match = iso.match(DATE_ONLY_UTC_PATTERN);
    return match ? `${match[1]}T00:00` : "";
  }

  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = normalizeLocalTimeString(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );

  // Legacy local-midnight date-only → keep as date-only in the form.
  if (time === "00:00") {
    return `${year}-${month}-${day}T00:00`;
  }

  return `${year}-${month}-${day}T${time}`;
}

export function datetimeLocalValueToIso(value: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeDatetimeLocalValue(value);
  if (!normalized) {
    return null;
  }

  const parts = splitDatetimeLocalValue(normalized);
  if (!parts) {
    return null;
  }

  // Date-only: store the selected calendar date as UTC midnight of that date.
  // Grouping uses the YYYY-MM-DD prefix so it does not shift by timezone.
  if (!datetimeLocalHasExplicitTime(normalized)) {
    return dateOnlyDayKeyToIso(parts.date);
  }

  return new Date(normalized).toISOString();
}

export const DUE_TIME_OPTIONS = generateDueTimeOptions();
