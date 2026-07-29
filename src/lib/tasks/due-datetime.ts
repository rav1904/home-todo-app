export const DUE_TIME_MINUTE_STEP = 5;

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

  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = normalizeLocalTimeString(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );

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

  return new Date(normalized).toISOString();
}

export const DUE_TIME_OPTIONS = generateDueTimeOptions();
