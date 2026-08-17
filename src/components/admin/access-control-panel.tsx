"use client";

import type {
  AccessRequestRow,
  AllowedUserRow,
} from "@/lib/access/queries";
import {
  addAllowedEmail,
  approveAccessRequest,
  reapproveAllowedEmail,
  rejectAccessRequest,
  revokeAllowedEmail,
} from "@/lib/access/mutations";
import {
  fieldClassName,
  formErrorClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
} from "@/lib/ui/field-classes";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AccessControlPanelProps = {
  pendingRequests: AccessRequestRow[];
  approvedUsers: AllowedUserRow[];
  revokedUsers: AllowedUserRow[];
  adminEmail: string;
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

export function AccessControlPanel({
  pendingRequests,
  approvedUsers,
  revokedUsers,
  adminEmail,
}: AccessControlPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState("");

  async function runAction(
    key: string,
    action: () => Promise<{ error: { message: string } | null }>,
  ) {
    setError(null);
    setBusyKey(key);
    const { error: actionError } = await action();
    if (actionError) {
      setError(actionError.message);
      setBusyKey(null);
      return;
    }
    setBusyKey(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error ? <p className={formErrorClassName}>{error}</p> : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Pending requests
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Approve or reject access requests from Google sign-ins.
          </p>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No pending requests.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {request.display_name || "Google user"}
                    </p>
                    <p className="break-all text-sm text-stone-500 dark:text-stone-400">
                      {request.email}
                    </p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                      Requested {formatDateTime(request.created_at)}
                    </p>
                    {request.message ? (
                      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                        {request.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyKey === `approve-${request.id}`}
                      className={formPrimaryButtonClassName}
                      onClick={() =>
                        runAction(`approve-${request.id}`, () =>
                          approveAccessRequest(request.id),
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === `reject-${request.id}`}
                      className={formSecondaryButtonClassName}
                      onClick={() =>
                        runAction(`reject-${request.id}`, () =>
                          rejectAccessRequest(request.id),
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Add approved email
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Manually allow an email before or after they sign in with Google.
          </p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const email = manualEmail.trim();
            if (!email) return;
            void runAction("add-email", async () => {
              const result = await addAllowedEmail(email);
              if (!result.error) {
                setManualEmail("");
              }
              return result;
            });
          }}
        >
          <input
            type="email"
            required
            value={manualEmail}
            onChange={(event) => setManualEmail(event.target.value)}
            placeholder="name@example.com"
            className={`${fieldClassName} sm:flex-1`}
          />
          <button
            type="submit"
            disabled={busyKey === "add-email"}
            className={formPrimaryButtonClassName}
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Approved users
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Revoke to block app data access. Admin email cannot be revoked here.
          </p>
        </div>
        {approvedUsers.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No approved users.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {approvedUsers.map((row) => {
              const isAdminRow =
                row.email.toLowerCase() === adminEmail.toLowerCase();
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-stone-900 dark:text-stone-100">
                      {row.email}
                      {isAdminRow ? (
                        <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                          admin
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {row.source} · since {formatDateTime(row.created_at)}
                    </p>
                  </div>
                  {!isAdminRow ? (
                    <button
                      type="button"
                      disabled={busyKey === `revoke-${row.email}`}
                      className={formSecondaryButtonClassName}
                      onClick={() =>
                        runAction(`revoke-${row.email}`, () =>
                          revokeAllowedEmail(row.email),
                        )
                      }
                    >
                      Revoke
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Revoked users
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Re-approve to restore access without a new request.
          </p>
        </div>
        {revokedUsers.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No revoked users.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {revokedUsers.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-stone-900 dark:text-stone-100">
                    {row.email}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Revoked{" "}
                    {row.revoked_at
                      ? formatDateTime(row.revoked_at)
                      : formatDateTime(row.updated_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyKey === `reapprove-${row.email}`}
                  className={formPrimaryButtonClassName}
                  onClick={() =>
                    runAction(`reapprove-${row.email}`, () =>
                      reapproveAllowedEmail(row.email),
                    )
                  }
                >
                  Re-approve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
