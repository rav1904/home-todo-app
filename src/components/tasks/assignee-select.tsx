"use client";

import { loadAssignableUsersForCategory } from "@/lib/tasks/assignees";
import type { TaskUserProfile } from "@/lib/tasks/creators";
import { createClient } from "@/lib/supabase/client";
import {
  compactFieldClassName,
  formLabelClassName,
} from "@/lib/ui/field-classes";
import { useEffect, useRef, useState } from "react";

type AssigneeSelectProps = {
  id: string;
  categoryId: string | null;
  value: string | null;
  currentUserId: string | null;
  onChange: (userId: string | null) => void;
  onInvalidated?: () => void;
  disabled?: boolean;
};

export function AssigneeSelect({
  id,
  categoryId,
  value,
  currentUserId,
  onChange,
  onInvalidated,
  disabled = false,
}: AssigneeSelectProps) {
  const [options, setOptions] = useState<TaskUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const categoryRef = useRef(categoryId);
  const onChangeRef = useRef(onChange);
  const onInvalidatedRef = useRef(onInvalidated);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  onInvalidatedRef.current = onInvalidated;
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const users = await loadAssignableUsersForCategory(supabase, categoryId);
      if (cancelled) {
        return;
      }

      setOptions(users);
      setLoading(false);

      const categoryChanged = categoryRef.current !== categoryId;
      categoryRef.current = categoryId;

      const current = valueRef.current;
      if (!categoryChanged || !current) {
        return;
      }

      const stillEligible = users.some((user) => user.id === current);
      if (!stillEligible) {
        onChangeRef.current(null);
        onInvalidatedRef.current?.();
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={formLabelClassName}>
        Assignee
        <span className="font-normal text-stone-400 dark:text-stone-500">
          {" "}
          · optional
        </span>
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled || loading}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : null)
        }
        className={compactFieldClassName}
      >
        <option value="">Unassigned</option>
        {value && !options.some((user) => user.id === value) ? (
          <option value={value}>Assigned</option>
        ) : null}
        {options.map((user) => {
          const isMe = currentUserId !== null && user.id === currentUserId;
          const label = isMe ? `${user.displayName} (me)` : user.displayName;
          return (
            <option key={user.id} value={user.id}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
