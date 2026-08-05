import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireCurrentUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, timezone: true },
  });
}
