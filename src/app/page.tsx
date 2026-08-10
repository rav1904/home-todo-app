import { isCurrentUserAllowed } from "@/lib/access/allowed";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!(await isCurrentUserAllowed(user, supabase))) {
    redirect("/access-request");
  }

  redirect("/dashboard");
}
