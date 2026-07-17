import "server-only";

import { createAdminAuthClient } from "@/lib/supabase/admin";

export type UserTaskCounts = {
  total: number;
  outstanding: number;
  completed: number;
};

export type TaskCountsByUserId = Record<string, UserTaskCounts>;

const emptyCounts = (): UserTaskCounts => ({
  total: 0,
  outstanding: 0,
  completed: 0,
});

export async function fetchTaskCountsByUserId(): Promise<TaskCountsByUserId> {
  const adminClient = createAdminAuthClient();
  const counts: TaskCountsByUserId = {};

  const { data, error } = await adminClient
    .from("tasks")
    .select("user_id, completed");

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (!counts[row.user_id]) {
      counts[row.user_id] = emptyCounts();
    }

    counts[row.user_id].total += 1;

    if (row.completed) {
      counts[row.user_id].completed += 1;
    } else {
      counts[row.user_id].outstanding += 1;
    }
  }

  return counts;
}

export function getTaskCountsForUser(
  countsByUserId: TaskCountsByUserId,
  userId: string,
): UserTaskCounts {
  return countsByUserId[userId] ?? emptyCounts();
}
