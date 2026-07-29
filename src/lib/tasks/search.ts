export type TaskSearchQuery = string;

export function parseSearchQueryParam(param: string | undefined): TaskSearchQuery {
  return (param ?? "").trim();
}

export function searchQueryToParam(query: TaskSearchQuery): string | null {
  const trimmed = query.trim();
  return trimmed ? trimmed : null;
}

export function isSearchQueryActive(query: TaskSearchQuery) {
  return query.trim().length > 0;
}

export function getSearchQueryLabel(query: TaskSearchQuery): string | null {
  const trimmed = query.trim();
  return trimmed ? `“${trimmed}”` : null;
}

export function filterTasksBySearch<
  T extends { title: string; description: string | null },
>(tasks: T[], query: TaskSearchQuery): T[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return tasks;
  }

  return tasks.filter((task) => {
    const title = task.title.toLowerCase();
    const description = (task.description ?? "").toLowerCase();
    return title.includes(normalized) || description.includes(normalized);
  });
}
