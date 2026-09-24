"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CreateTaskDefaultsContextValue = {
  /** Top-level Category id from the current page filter, or null for no override. */
  initialCategoryId: string | null;
  setInitialCategoryId: (categoryId: string | null) => void;
};

const CreateTaskDefaultsContext =
  createContext<CreateTaskDefaultsContextValue | null>(null);

export function CreateTaskDefaultsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [initialCategoryId, setInitialCategoryIdState] = useState<string | null>(
    null,
  );

  const setInitialCategoryId = useCallback((categoryId: string | null) => {
    setInitialCategoryIdState(categoryId);
  }, []);

  const value = useMemo(
    () => ({ initialCategoryId, setInitialCategoryId }),
    [initialCategoryId, setInitialCategoryId],
  );

  return (
    <CreateTaskDefaultsContext.Provider value={value}>
      {children}
    </CreateTaskDefaultsContext.Provider>
  );
}

export function useCreateTaskDefaults() {
  const context = useContext(CreateTaskDefaultsContext);
  if (!context) {
    throw new Error(
      "useCreateTaskDefaults must be used within CreateTaskDefaultsProvider",
    );
  }
  return context;
}
