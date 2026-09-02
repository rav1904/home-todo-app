"use client";

import { LoadingButton } from "@/components/ui/loading-button";
import { setDisplayNameOverride } from "@/lib/access/mutations";
import {
  DISPLAY_NAME_OVERRIDE_MAX_LENGTH,
  parseDisplayNameOverride,
} from "@/lib/auth/user-display";
import {
  compactFieldClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
} from "@/lib/ui/field-classes";
import { useEffect, useState } from "react";

type DisplayNameOverrideFieldProps = {
  email: string;
  override: string | null;
  busyKey: string | null;
  actionPrefix: string;
  onAction: (
    key: string,
    action: () => Promise<{ error: { message: string } | null }>,
  ) => Promise<void>;
};

export function DisplayNameOverrideField({
  email,
  override,
  busyKey,
  actionPrefix,
  onAction,
}: DisplayNameOverrideFieldProps) {
  const [draft, setDraft] = useState(override ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(override ?? "");
  }, [override]);

  const saveKey = `${actionPrefix}-save`;
  const clearKey = `${actionPrefix}-clear`;
  const isBusy = busyKey !== null;
  const isSaving = busyKey === saveKey;
  const isClearing = busyKey === clearKey;

  async function saveValue(raw: string) {
    setLocalError(null);
    const parsed = parseDisplayNameOverride(raw);
    if ("error" in parsed) {
      setLocalError(parsed.error);
      return;
    }

    await onAction(saveKey, () => setDisplayNameOverride(email, parsed.value));
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label className={formLabelClassName} htmlFor={`display-name-${actionPrefix}`}>
        Display name override
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={`display-name-${actionPrefix}`}
          type="text"
          value={draft}
          maxLength={DISPLAY_NAME_OVERRIDE_MAX_LENGTH}
          disabled={isBusy}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setLocalError(null);
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void saveValue(draft);
            }
          }}
          placeholder="Leave blank to use Google name"
          className={compactFieldClassName}
        />
        <div className="flex min-w-0 flex-wrap gap-2">
          <LoadingButton
            type="button"
            loading={isSaving}
            disabled={isBusy}
            idleLabel="Save"
            loadingLabel="Saving…"
            minLabelWidthClassName="min-w-[5.5rem]"
            className={formPrimaryButtonClassName}
            onClick={() => void saveValue(draft)}
          />
          {override ? (
            <LoadingButton
              type="button"
              loading={isClearing}
              disabled={isBusy}
              idleLabel="Clear"
              loadingLabel="Clearing…"
              minLabelWidthClassName="min-w-[5.5rem]"
              className={formSecondaryButtonClassName}
              onClick={() =>
                void onAction(clearKey, () =>
                  setDisplayNameOverride(email, null),
                )
              }
            />
          ) : null}
        </div>
      </div>
      {localError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{localError}</p>
      ) : (
        <p className="text-[11px] text-stone-400 dark:text-stone-500">
          Max {DISPLAY_NAME_OVERRIDE_MAX_LENGTH} characters. Blank clears the
          override.
        </p>
      )}
    </div>
  );
}
