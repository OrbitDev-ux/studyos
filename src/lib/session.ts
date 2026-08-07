import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  timezone: string;
  school: string | null;
};

export async function requireCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, name, email, image, timezone, school, bannedAt")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;

  // A banned account keeps its data but loses access everywhere the app gates
  // through requireCurrentUser. The admin ban action sets bannedAt; without
  // this check the ban would have no effect at all.
  if ((data as { bannedAt: string | null }).bannedAt) {
    redirect("/suspended");
  }

  return data as CurrentUser;
}
