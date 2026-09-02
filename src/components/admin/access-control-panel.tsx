"use client";

import { DisplayNameOverrideField } from "@/components/admin/display-name-override-field";
import { LoadingButton } from "@/components/ui/loading-button";
import type {
  AccessRequestRow,
  AllowedUserAdminView,
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
  approvedUsers: AllowedUserAdminView[];
  revokedUsers: AllowedUserAdminView[];
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

function UserNameDetails({
  row,
  accessStatus,
}: {
  row: AllowedUserAdminView;
  accessStatus: string;
}) {
  return (
    <dl className="mt-2 min-w-0 space-y-1 text-xs text-stone-500 dark:text-stone-400">
      <div className="min-w-0">
        <dt className="inline text-stone-400 dark:text-stone-500">Google: </dt>
        <dd className="inline break-words">
          {row.authDisplayName || "Not signed in yet"}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="inline text-stone-400 dark:text-stone-500">
          Override:{" "}
        </dt>
        <dd className="inline break-words">
          {row.display_name_override || "None"}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="inline text-stone-400 dark:text-stone-500">
          Effective:{" "}
        </dt>
        <dd className="inline break-words font-medium text-stone-700 dark:text-stone-300">
          {row.effectiveDisplayName}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="inline text-stone-400 dark:text-stone-500">Access: </dt>
        <dd className="inline">{accessStatus}</dd>
      </div>
    </dl>
  );
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
    <div className="min-w-0 space-y-8">
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
                    <LoadingButton
                      type="button"
                      loading={busyKey === `approve-${request.id}`}
                      disabled={busyKey !== null}
                      idleLabel="Approve"
                      loadingLabel="Approving…"
                      minLabelWidthClassName="min-w-[6.5rem]"
                      className={formPrimaryButtonClassName}
                      onClick={() =>
                        runAction(`approve-${request.id}`, () =>
                          approveAccessRequest(request.id),
                        )
                      }
                    />
                    <LoadingButton
                      type="button"
                      loading={busyKey === `reject-${request.id}`}
                      disabled={busyKey !== null}
                      idleLabel="Reject"
                      loadingLabel="Rejecting…"
                      minLabelWidthClassName="min-w-[6.5rem]"
                      className={formSecondaryButtonClassName}
                      onClick={() =>
                        runAction(`reject-${request.id}`, () =>
                          rejectAccessRequest(request.id),
                        )
                      }
                    />
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
          <LoadingButton
            type="submit"
            loading={busyKey === "add-email"}
            disabled={busyKey !== null}
            idleLabel="Add"
            loadingLabel="Adding…"
            minLabelWidthClassName="min-w-[5rem]"
            className={formPrimaryButtonClassName}
          />
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
          <ul className="min-w-0 divide-y divide-stone-200 rounded-2xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {approvedUsers.map((row) => {
              const isAdminRow =
                row.email.toLowerCase() === adminEmail.toLowerCase();
              return (
                <li
                  key={row.id}
                  className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 w-full sm:flex-1">
                    <p className="break-all text-sm font-medium text-stone-900 dark:text-stone-100">
                      {row.email}
                      {isAdminRow ? (
                        <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                          admin
                        </span>
                      ) : null}
                    </p>
                    <UserNameDetails row={row} accessStatus="Approved" />
                    <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                      {row.source} · since {formatDateTime(row.created_at)}
                    </p>
                    <div className="mt-3">
                      <DisplayNameOverrideField
                        email={row.email}
                        override={row.display_name_override}
                        busyKey={busyKey}
                        actionPrefix={`override-${row.id}`}
                        onAction={runAction}
                      />
                    </div>
                  </div>
                  {!isAdminRow ? (
                    <LoadingButton
                      type="button"
                      loading={busyKey === `revoke-${row.email}`}
                      disabled={busyKey !== null}
                      idleLabel="Revoke"
                      loadingLabel="Revoking…"
                      minLabelWidthClassName="min-w-[6.5rem]"
                      className={formSecondaryButtonClassName}
                      onClick={() =>
                        runAction(`revoke-${row.email}`, () =>
                          revokeAllowedEmail(row.email),
                        )
                      }
                    />
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
          <ul className="min-w-0 divide-y divide-stone-200 rounded-2xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {revokedUsers.map((row) => (
              <li
                key={row.id}
                className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 w-full sm:flex-1">
                  <p className="break-all text-sm font-medium text-stone-900 dark:text-stone-100">
                    {row.email}
                  </p>
                  <UserNameDetails row={row} accessStatus="Revoked" />
                  <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                    Revoked{" "}
                    {row.revoked_at
                      ? formatDateTime(row.revoked_at)
                      : formatDateTime(row.updated_at)}
                  </p>
                  <div className="mt-3">
                    <DisplayNameOverrideField
                      email={row.email}
                      override={row.display_name_override}
                      busyKey={busyKey}
                      actionPrefix={`override-${row.id}`}
                      onAction={runAction}
                    />
                  </div>
                </div>
                <LoadingButton
                  type="button"
                  loading={busyKey === `reapprove-${row.email}`}
                  disabled={busyKey !== null}
                  idleLabel="Re-approve"
                  loadingLabel="Approving…"
                  minLabelWidthClassName="min-w-[7rem]"
                  className={formPrimaryButtonClassName}
                  onClick={() =>
                    runAction(`reapprove-${row.email}`, () =>
                      reapproveAllowedEmail(row.email),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
