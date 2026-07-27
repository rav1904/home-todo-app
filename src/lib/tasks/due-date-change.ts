export type DueDateChangeDirection =
  | "set"
  | "cleared"
  | "moved_earlier"
  | "moved_later"
  | "changed";

export type DueDateHistoryCounts = {
  dueDateUpdateCount: number;
  movedLaterCount: number;
  movedEarlierCount: number;
};

export const MOVED_LATER_NUDGE =
  "This task has been moved forward several times. Consider breaking it into a smaller step or reviewing whether it is still a priority.";

export function normalizeDueAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function dueAtValuesEqual(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const normalizedPrevious = normalizeDueAt(previous);
  const normalizedNext = normalizeDueAt(next);

  if (normalizedPrevious === null && normalizedNext === null) {
    return true;
  }

  if (normalizedPrevious === null || normalizedNext === null) {
    return false;
  }

  return normalizedPrevious === normalizedNext;
}

export function getChangeDirection(
  previous: string | null | undefined,
  next: string | null | undefined,
): DueDateChangeDirection {
  const normalizedPrevious = normalizeDueAt(previous);
  const normalizedNext = normalizeDueAt(next);

  if (normalizedPrevious === null && normalizedNext !== null) {
    return "set";
  }

  if (normalizedPrevious !== null && normalizedNext === null) {
    return "cleared";
  }

  if (normalizedPrevious !== null && normalizedNext !== null) {
    const previousTime = new Date(normalizedPrevious).getTime();
    const nextTime = new Date(normalizedNext).getTime();

    if (nextTime > previousTime) {
      return "moved_later";
    }

    if (nextTime < previousTime) {
      return "moved_earlier";
    }

    return "changed";
  }

  return "changed";
}

export function aggregateDueDateHistoryCounts(
  rows: { task_id: string; change_direction: string }[],
): Record<string, DueDateHistoryCounts> {
  const counts: Record<string, DueDateHistoryCounts> = {};

  for (const row of rows) {
    if (!counts[row.task_id]) {
      counts[row.task_id] = {
        dueDateUpdateCount: 0,
        movedLaterCount: 0,
        movedEarlierCount: 0,
      };
    }

    counts[row.task_id].dueDateUpdateCount += 1;

    if (row.change_direction === "moved_later") {
      counts[row.task_id].movedLaterCount += 1;
    }

    if (row.change_direction === "moved_earlier") {
      counts[row.task_id].movedEarlierCount += 1;
    }
  }

  return counts;
}

export function getDueDateHistoryLines(counts: DueDateHistoryCounts): string[] {
  const lines: string[] = [];

  if (counts.dueDateUpdateCount === 1) {
    lines.push("Due date updated 1 time");
  } else if (counts.dueDateUpdateCount >= 2) {
    lines.push(`Due date updated ${counts.dueDateUpdateCount} times`);
  }

  if (counts.movedLaterCount === 1) {
    lines.push("Moved later 1 time");
  } else if (counts.movedLaterCount >= 2) {
    lines.push(`Moved later ${counts.movedLaterCount} times`);
  }

  if (counts.movedEarlierCount === 1) {
    lines.push("Moved earlier 1 time");
  } else if (counts.movedEarlierCount >= 2) {
    lines.push(`Moved earlier ${counts.movedEarlierCount} times`);
  }

  return lines;
}
