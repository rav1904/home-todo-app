import type { AppUserSummary } from "@/lib/admin/users";
import type {
  AllowedUserAdminView,
  AllowedUserRow,
} from "@/lib/access/queries";
import { getUserDisplayName } from "@/lib/auth/user-display";

export function toAllowedUserAdminView(
  row: AllowedUserRow,
  authUser: AppUserSummary | undefined,
): AllowedUserAdminView {
  return {
    ...row,
    authDisplayName: authUser?.authDisplayName ?? null,
    effectiveDisplayName: getUserDisplayName(
      authUser?.authDisplayName
        ? { full_name: authUser.authDisplayName }
        : null,
      row.email,
      row.email,
      row.display_name_override,
    ),
  };
}

export function enrichAllowedUsers(
  rows: AllowedUserRow[],
  authUsers: AppUserSummary[],
): AllowedUserAdminView[] {
  const byEmail = new Map(
    authUsers.flatMap((user) =>
      user.email ? [[user.email.toLowerCase(), user] as const] : [],
    ),
  );

  return rows.map((row) =>
    toAllowedUserAdminView(row, byEmail.get(row.email.toLowerCase())),
  );
}
