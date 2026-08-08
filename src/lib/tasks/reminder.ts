import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from "@/lib/tasks/due-datetime";

/** Active reminder: set and task not completed. */

export type ReminderMode = "custom" | "relative_due";

export type ReminderOffsetMinutes = 60 | 1440 | 10080;

export const REMINDER_OFFSET_OPTIONS: {
  minutes: ReminderOffsetMinutes;
  label: string;
}[] = [
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 10080, label: "1 week before" },
];

export type ReminderFormState = {
  mode: ReminderMode | null;
  offsetMinutes: ReminderOffsetMinutes | null;
  /** datetime-local value when mode is custom */
  customLocal: string;
};

export type ReminderDbColumns = {
  reminder_at: string | null;
  reminder_mode: ReminderMode | null;
  reminder_offset_minutes: ReminderOffsetMinutes | null;
};

export type ReminderSelectValue =
  | "none"
  | "custom"
  | "60"
  | "1440"
  | "10080";

export function emptyReminderFormState(): ReminderFormState {
  return {
    mode: null,
    offsetMinutes: null,
    customLocal: "",
  };
}

export function isReminderOffsetMinutes(
  value: number | null | undefined,
): value is ReminderOffsetMinutes {
  return value === 60 || value === 1440 || value === 10080;
}

export function computeRelativeReminderAt(
  dueAtIso: string,
  offsetMinutes: ReminderOffsetMinutes,
): string {
  return new Date(
    new Date(dueAtIso).getTime() - offsetMinutes * 60_000,
  ).toISOString();
}

export function reminderFormFromDb(input: {
  reminderAt: string | null;
  reminderMode: string | null;
  reminderOffsetMinutes: number | null;
}): ReminderFormState {
  const { reminderAt, reminderMode, reminderOffsetMinutes } = input;

  if (!reminderMode || !reminderAt) {
    return emptyReminderFormState();
  }

  if (reminderMode === "custom") {
    return {
      mode: "custom",
      offsetMinutes: null,
      customLocal: isoToDatetimeLocalValue(reminderAt),
    };
  }

  if (
    reminderMode === "relative_due" &&
    isReminderOffsetMinutes(reminderOffsetMinutes)
  ) {
    return {
      mode: "relative_due",
      offsetMinutes: reminderOffsetMinutes,
      customLocal: "",
    };
  }

  return {
    mode: "custom",
    offsetMinutes: null,
    customLocal: isoToDatetimeLocalValue(reminderAt),
  };
}

export function reminderSelectValueFromForm(
  form: ReminderFormState,
): ReminderSelectValue {
  if (!form.mode) {
    return "none";
  }

  if (form.mode === "custom") {
    return "custom";
  }

  if (form.offsetMinutes === 60) {
    return "60";
  }

  if (form.offsetMinutes === 1440) {
    return "1440";
  }

  if (form.offsetMinutes === 10080) {
    return "10080";
  }

  return "none";
}

export function reminderFormFromSelectValue(
  value: ReminderSelectValue,
  previous: ReminderFormState,
): ReminderFormState {
  if (value === "none") {
    return emptyReminderFormState();
  }

  if (value === "custom") {
    return {
      mode: "custom",
      offsetMinutes: null,
      customLocal: previous.customLocal,
    };
  }

  const offset = Number(value);
  if (!isReminderOffsetMinutes(offset)) {
    return emptyReminderFormState();
  }

  return {
    mode: "relative_due",
    offsetMinutes: offset,
    customLocal: "",
  };
}

/** When due date changes: keep custom; recalc/clear relative. */
export function syncReminderFormWithDueLocal(
  dueLocal: string,
  reminder: ReminderFormState,
): ReminderFormState {
  if (reminder.mode !== "relative_due") {
    return reminder;
  }

  if (!dueLocal) {
    return emptyReminderFormState();
  }

  return reminder;
}

export function toReminderDbColumns(
  dueAtIso: string | null,
  reminder: ReminderFormState,
): ReminderDbColumns {
  if (!reminder.mode) {
    return {
      reminder_at: null,
      reminder_mode: null,
      reminder_offset_minutes: null,
    };
  }

  if (reminder.mode === "custom") {
    const reminderAt = datetimeLocalValueToIso(reminder.customLocal);
    if (!reminderAt) {
      return {
        reminder_at: null,
        reminder_mode: null,
        reminder_offset_minutes: null,
      };
    }

    return {
      reminder_at: reminderAt,
      reminder_mode: "custom",
      reminder_offset_minutes: null,
    };
  }

  if (!dueAtIso || !reminder.offsetMinutes) {
    return {
      reminder_at: null,
      reminder_mode: null,
      reminder_offset_minutes: null,
    };
  }

  return {
    reminder_at: computeRelativeReminderAt(dueAtIso, reminder.offsetMinutes),
    reminder_mode: "relative_due",
    reminder_offset_minutes: reminder.offsetMinutes,
  };
}

export type ReminderTaskLike = {
  reminder_at: string | null;
  completed: boolean;
};

export function hasActiveReminder(task: ReminderTaskLike): boolean {
  return Boolean(task.reminder_at) && !task.completed;
}

/** Due now or overdue — wall-clock comparison. */
export function isReminderDueOrOverdue(
  reminderAt: string,
  now = new Date(),
): boolean {
  return new Date(reminderAt).getTime() <= now.getTime();
}

export function isReminderUpcoming(
  reminderAt: string,
  now = new Date(),
): boolean {
  return new Date(reminderAt).getTime() > now.getTime();
}

export function formatReminderDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getReminderCardLabel(
  reminderAt: string | null,
  completed: boolean,
  options?: {
    reminderMode?: string | null;
    reminderOffsetMinutes?: number | null;
    now?: Date;
  },
): { text: string; overdue: boolean } | null {
  if (!reminderAt || completed) {
    return null;
  }

  const now = options?.now ?? new Date();
  const formatted = formatReminderDateTime(reminderAt);
  const overdue = isReminderDueOrOverdue(reminderAt, now);

  let prefix = "Reminder";
  if (
    options?.reminderMode === "relative_due" &&
    isReminderOffsetMinutes(options.reminderOffsetMinutes ?? null)
  ) {
    const option = REMINDER_OFFSET_OPTIONS.find(
      (entry) => entry.minutes === options.reminderOffsetMinutes,
    );
    if (option) {
      prefix = `Reminder (${option.label.replace(" due date", "")})`;
    }
  }

  if (overdue) {
    return {
      text: `${prefix} overdue · ${formatted}`,
      overdue: true,
    };
  }

  return {
    text: `${prefix} · ${formatted}`,
    overdue: false,
  };
}

export function partitionActiveReminders<T extends ReminderTaskLike>(
  tasks: T[],
  now = new Date(),
): { dueOrOverdue: T[]; upcoming: T[] } {
  const active = tasks.filter(hasActiveReminder);

  const dueOrOverdue = active
    .filter((task) => isReminderDueOrOverdue(task.reminder_at!, now))
    .sort(
      (left, right) =>
        new Date(left.reminder_at!).getTime() -
        new Date(right.reminder_at!).getTime(),
    );

  const upcoming = active
    .filter((task) => isReminderUpcoming(task.reminder_at!, now))
    .sort(
      (left, right) =>
        new Date(left.reminder_at!).getTime() -
        new Date(right.reminder_at!).getTime(),
    );

  return { dueOrOverdue, upcoming };
}
