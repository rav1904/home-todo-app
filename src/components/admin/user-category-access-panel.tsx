"use client";

import type { AppUserSummary } from "@/lib/admin/users";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  formErrorClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
} from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type CategoryGrantRow = {
  user_id: string;
  category_id: string;
};

type UserCategoryAccessPanelProps = {
  users: AppUserSummary[];
  globalTopLevelCategories: Category[];
  grants: CategoryGrantRow[];
  adminUserId: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildGrantMap(grants: CategoryGrantRow[]) {
  const map = new Map<string, Set<string>>();
  for (const grant of grants) {
    const existing = map.get(grant.user_id) ?? new Set<string>();
    existing.add(grant.category_id);
    map.set(grant.user_id, existing);
  }
  return map;
}

export function UserCategoryAccessPanel({
  users,
  globalTopLevelCategories,
  grants,
  adminUserId,
}: UserCategoryAccessPanelProps) {
  const router = useRouter();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [draftByUserId, setDraftByUserId] = useState<Record<string, string[]>>(
    {},
  );
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grantMap = useMemo(() => buildGrantMap(grants), [grants]);

  const sortedCategories = useMemo(
    () =>
      [...globalTopLevelCategories].sort(
        (left, right) =>
          left.sort_order - right.sort_order ||
          left.name.localeCompare(right.name),
      ),
    [globalTopLevelCategories],
  );

  function getSelectedIds(userId: string) {
    if (draftByUserId[userId]) {
      return draftByUserId[userId];
    }
    return [...(grantMap.get(userId) ?? [])];
  }

  function toggleExpanded(userId: string) {
    setError(null);
    setExpandedUserId((current) => (current === userId ? null : userId));
    setDraftByUserId((current) => {
      if (current[userId]) {
        return current;
      }
      return {
        ...current,
        [userId]: [...(grantMap.get(userId) ?? [])],
      };
    });
  }

  function toggleCategory(userId: string, categoryId: string) {
    setDraftByUserId((current) => {
      const selected = new Set(current[userId] ?? getSelectedIds(userId));
      if (selected.has(categoryId)) {
        selected.delete(categoryId);
      } else {
        selected.add(categoryId);
      }
      return { ...current, [userId]: [...selected] };
    });
  }

  async function saveGrants(userId: string) {
    setSavingUserId(userId);
    setError(null);

    const nextIds = new Set(getSelectedIds(userId));
    const existingIds = grantMap.get(userId) ?? new Set<string>();
    const toInsert = [...nextIds].filter((id) => !existingIds.has(id));
    const toDelete = [...existingIds].filter((id) => !nextIds.has(id));

    const supabase = createClient();

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_category_access")
        .delete()
        .eq("user_id", userId)
        .in("category_id", toDelete);

      if (deleteError) {
        setError(deleteError.message);
        setSavingUserId(null);
        return;
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("user_category_access")
        .insert(
          toInsert.map((categoryId) => ({
            user_id: userId,
            category_id: categoryId,
            granted_by: adminUserId,
          })),
        );

      if (insertError) {
        setError(insertError.message);
        setSavingUserId(null);
        return;
      }
    }

    setSavingUserId(null);
    setDraftByUserId((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    router.refresh();
  }

  return (
    <div className="mt-4 min-w-0 space-y-3">
      {error ? <p className={formErrorClassName}>{error}</p> : null}

      <ul className="min-w-0 space-y-3">
        {users.map((appUser) => {
          const selectedCount = getSelectedIds(appUser.id).length;
          const isExpanded = expandedUserId === appUser.id;
          const selectedIds = new Set(getSelectedIds(appUser.id));

          return (
            <li
              key={appUser.id}
              className="min-w-0 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <UserAvatar
                  name={appUser.displayName}
                  avatarUrl={appUser.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-900 dark:text-stone-100">
                    {appUser.displayName}
                  </p>
                  <p className="break-all text-xs text-stone-500 dark:text-stone-400">
                    {appUser.email ?? "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                    Created {formatDateTime(appUser.createdAt)}
                    {" · "}
                    Last sign-in{" "}
                    {appUser.lastSignInAt
                      ? formatDateTime(appUser.lastSignInAt)
                      : "Never"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(appUser.id)}
                  className="cursor-pointer text-left text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {selectedCount === 0
                    ? "Personal only · Edit access"
                    : `${selectedCount} categor${selectedCount === 1 ? "y" : "ies"} · Edit access`}
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-3 min-w-0 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/60">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Personal stays private. Grant shared category membership
                    for global top-level categories (subcategories inherit).
                    Members can see each other&apos;s tasks in that category.
                  </p>
                  {sortedCategories.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      No shared categories yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {sortedCategories.map((category) => (
                        <li key={category.id} className="min-w-0">
                          <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm text-stone-800 dark:text-stone-200">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(category.id)}
                              onChange={() =>
                                toggleCategory(appUser.id, category.id)
                              }
                              className="mt-0.5 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span
                              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: category.colour }}
                              aria-hidden
                            />
                            <span className="min-w-0 break-words">
                              <span className="block">
                                {formatCategoryNameForDisplay(category.name)}
                              </span>
                              {category.admin_note ? (
                                <span className="block text-xs text-stone-500 dark:text-stone-400">
                                  {category.admin_note}
                                </span>
                              ) : null}
                              {!category.active ? (
                                <span className="text-xs text-stone-400">
                                  (inactive)
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <LoadingButton
                      type="button"
                      loading={savingUserId === appUser.id}
                      idleLabel="Save membership"
                      loadingLabel="Saving…"
                      minLabelWidthClassName="min-w-[9rem]"
                      className={formPrimaryButtonClassName}
                      onClick={() => void saveGrants(appUser.id)}
                    />
                    <button
                      type="button"
                      className={formSecondaryButtonClassName}
                      disabled={savingUserId === appUser.id}
                      onClick={() => setExpandedUserId(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
