import { AccessRequestForm } from "@/components/access/access-request-form";
import { isCurrentUserAllowed } from "@/lib/access/allowed";
import { getMyPendingAccessRequest } from "@/lib/access/queries";
import {
  getUserDisplayName,
} from "@/lib/auth/user-display";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccessRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login");
  }

  if (await isCurrentUserAllowed(user, supabase)) {
    redirect("/dashboard");
  }

  const pending = await getMyPendingAccessRequest();
  const displayName = getUserDisplayName(
    user.user_metadata,
    user.email,
    "Google user",
  );

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <AccessRequestForm
        displayName={displayName}
        email={user.email}
        alreadySubmitted={Boolean(pending)}
      />
    </div>
  );
}
