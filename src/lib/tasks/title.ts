/** Soft UI limit for new/edited task titles. Existing longer titles are not migrated. */
export const TASK_TITLE_MAX_LENGTH = 50;

/** Show a short-name nudge once the title reaches this length. */
export const TASK_TITLE_WARNING_LENGTH = 40;

export const TASK_TITLE_LENGTH_HINT =
  "Keep the task name short. Use Notes for details.";

export const TASK_TITLE_LIMIT_REACHED =
  "Title limit reached (50). Use Notes for details.";

/**
 * Validates a task title for create/update.
 * Does not truncate existing long titles in the DB — callers must reject over-limit saves.
 */
export function validateTaskTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "Title is required.";
  }

  if (trimmed.length > TASK_TITLE_MAX_LENGTH) {
    return `Keep the task name to ${TASK_TITLE_MAX_LENGTH} characters or fewer. Use Notes for details.`;
  }

  return null;
}

/**
 * Restricts title input growth past the max length while still allowing users
 * to shorten an existing over-limit title character by character.
 */
export function constrainTaskTitleInput(
  next: string,
  previous: string,
): string {
  if (next.length <= TASK_TITLE_MAX_LENGTH) {
    return next;
  }

  if (
    previous.length > TASK_TITLE_MAX_LENGTH &&
    next.length < previous.length
  ) {
    return next;
  }

  if (previous.length > TASK_TITLE_MAX_LENGTH) {
    return previous;
  }

  return next.slice(0, TASK_TITLE_MAX_LENGTH);
}
