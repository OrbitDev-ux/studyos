import type { Problem, Subject } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";

// The Supabase client has no generated DB types wired in, so every .from()
// call is loosely typed on its own — these annotate the query functions'
// return shapes by hand (matching exactly what Prisma used to return) so
// consumers keep the same compile-time safety they had before.
//
// `PublicChoice` deliberately omits `isCorrect`: this row flows straight into
// a "use client" component (ProblemCard → SolveProblemPanel) before the
// student has answered, and a client component's props are serialized to the
// browser in full — the same class of leak social/queries.ts's
// getReceivedFriendRequests doc comment warns about, just for answer keys
// instead of credentials.
type PublicChoice = { id: string; problemId: string; label: string; content: string };
type ProblemWithRelations = Problem & { choices: PublicChoice[]; subject: Subject | null };
type ProblemWithSubject = Problem & { subject: Subject | null };

export async function getProblems(userId: string): Promise<ProblemWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Problem")
    .select("*, choices:Choice(id,problemId,label,content), subject:Subject(*)")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as ProblemWithRelations[];
}

/** Small "recently added" slice for the dashboard card — not a real recommendation engine. */
export async function getRecentProblems(
  userId: string,
  limit: number,
): Promise<ProblemWithSubject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Problem")
    .select("*, subject:Subject(*)")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ProblemWithSubject[];
}
