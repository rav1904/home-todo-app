export type TaskRecurrence =
  | "none"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual";

export const DEFAULT_TASK_RECURRENCE: TaskRecurrence = "none";

export const TASK_RECURRENCE_OPTIONS: {
  value: TaskRecurrence;
  label: string;
}[] = [
  { value: "none", label: "No repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-annual" },
  { value: "annual", label: "Annual" },
];

export function isTaskRecurrence(value: unknown): value is TaskRecurrence {
  return TASK_RECURRENCE_OPTIONS.some((option) => option.value === value);
}

export function parseTaskRecurrence(value: unknown): TaskRecurrence {
  return isTaskRecurrence(value) ? value : DEFAULT_TASK_RECURRENCE;
}

export function getRecurrenceLabel(recurrence: TaskRecurrence): string {
  return (
    TASK_RECURRENCE_OPTIONS.find((option) => option.value === recurrence)
      ?.label ?? "No repeat"
  );
}

/** Human-readable badge copy for task cards (not the form select labels). */
export function getRecurrenceBadgeText(recurrence: TaskRecurrence): string | null {
  switch (recurrence) {
    case "none":
      return null;
    case "weekly":
      return "Repeats weekly";
    case "fortnightly":
      return "Repeats every 2 weeks";
    case "monthly":
      return "Repeats monthly";
    case "quarterly":
      return "Repeats quarterly";
    case "semi_annual":
      return "Repeats every 6 months";
    case "annual":
      return "Repeats annually";
  }
}

export const RECURRENCE_NEXT_OCCURRENCE_HINT =
  "Next occurrence will be created when this task is completed.";

export function recurrenceRequiresDueAt(recurrence: TaskRecurrence) {
  return recurrence !== "none";
}

export function validateRecurrenceDueAt(
  recurrence: TaskRecurrence,
  dueAtIso: string | null,
): string | null {
  if (recurrenceRequiresDueAt(recurrence) && !dueAtIso) {
    return "A due date is required for recurring tasks.";
  }

  return null;
}
