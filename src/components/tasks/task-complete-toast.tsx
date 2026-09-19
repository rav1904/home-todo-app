"use client";

import {
  completeTaskWithRecurrence,
  uncompleteTask,
} from "@/lib/tasks/complete-with-recurrence";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TOAST_MS = 6000;

type ToastState =
  | { type: "completed"; taskId: string }
  | { type: "error"; message: string };

type TaskCompleteToastContextValue = {
  completeTask: (taskId: string) => Promise<boolean>;
};

const TaskCompleteToastContext =
  createContext<TaskCompleteToastContextValue | null>(null);

export function useTaskCompleteAction() {
  const value = useContext(TaskCompleteToastContext);
  if (!value) {
    throw new Error("useTaskCompleteAction must be used within TaskCompleteToastProvider");
  }
  return value;
}

export function TaskCompleteToastProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (next: ToastState) => {
      clearTimer();
      setToast(next);
      hideTimerRef.current = window.setTimeout(() => {
        setToast(null);
        hideTimerRef.current = null;
      }, TOAST_MS);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const completeTask = useCallback(
    async (taskId: string) => {
      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;
      const supabase = createClient();
      const { error } = await completeTaskWithRecurrence(supabase, taskId);
      inFlightRef.current = false;

      if (error) {
        showToast({ type: "error", message: error });
        return false;
      }

      showToast({ type: "completed", taskId });
      router.refresh();
      return true;
    },
    [router, showToast],
  );

  async function handleUndo() {
    if (!toast || toast.type !== "completed" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const supabase = createClient();
    const { error } = await uncompleteTask(supabase, toast.taskId);
    inFlightRef.current = false;

    if (error) {
      showToast({ type: "error", message: error });
      return;
    }

    clearTimer();
    setToast(null);
    router.refresh();
  }

  return (
    <TaskCompleteToastContext.Provider value={{ completeTask }}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed z-50 flex justify-start"
          style={{
            left: "max(0.75rem, env(safe-area-inset-left))",
            right: "max(5.5rem, calc(env(safe-area-inset-right) + 4.5rem))",
            bottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          <div
            role={toast.type === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-full min-w-0 items-center gap-3 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
          >
            <p className="min-w-0 truncate">
              {toast.type === "completed" ? "Task completed" : toast.message}
            </p>
            {toast.type === "completed" ? (
              <button
                type="button"
                onClick={() => void handleUndo()}
                className="shrink-0 cursor-pointer text-sm font-semibold text-emerald-300 underline-offset-2 hover:underline dark:text-emerald-700"
              >
                Undo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </TaskCompleteToastContext.Provider>
  );
}
