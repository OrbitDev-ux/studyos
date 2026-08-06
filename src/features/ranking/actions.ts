"use server";

import { revalidatePath } from "next/cache";
import { schoolFormSchema } from "@/features/ranking/schema";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";

export async function updateSchool(school: string) {
  const user = await requireCurrentUser();
  const parsed = schoolFormSchema.parse({ school });

  const supabase = await createClient();
  const { error } = await supabase
    .from("User")
    .update({ school: parsed.school })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/ranking");
}
