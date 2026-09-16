export const SUPPORT_MUST_DIFFER_MESSAGE =
  "Support must be different from Assigned to.";

export function assignedAndSupportConflict(
  assignedTo: string | null | undefined,
  supportAssignedTo: string | null | undefined,
): boolean {
  return Boolean(
    assignedTo && supportAssignedTo && assignedTo === supportAssignedTo,
  );
}

export function messageIfAssignedSupportConflict(
  assignedTo: string | null | undefined,
  supportAssignedTo: string | null | undefined,
): string | null {
  return assignedAndSupportConflict(assignedTo, supportAssignedTo)
    ? SUPPORT_MUST_DIFFER_MESSAGE
    : null;
}

export function mapTaskPeopleSaveError(message: string | undefined): string {
  if (!message) {
    return "Could not save task.";
  }
  if (message.includes(SUPPORT_MUST_DIFFER_MESSAGE)) {
    return SUPPORT_MUST_DIFFER_MESSAGE;
  }
  return message;
}

export function focusAssigneeTowerOwner(task: {
  assigned_to?: string | null;
  support_assigned_to?: string | null;
}): string | null {
  return task.assigned_to ?? task.support_assigned_to ?? null;
}
