import { prisma } from "@/lib/prisma";

export type AnnouncementStatus = "published" | "scheduled" | "draft";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  status: AnnouncementStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  authorName: string | null;
};

function deriveStatus(
  publishedAt: Date | null,
  scheduledAt: Date | null,
): AnnouncementStatus {
  if (publishedAt) return "published";
  if (scheduledAt) return "scheduled";
  return "draft";
}

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true, email: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    isPinned: row.isPinned,
    status: deriveStatus(row.publishedAt, row.scheduledAt),
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    authorName: row.author?.name ?? row.author?.email ?? null,
  }));
}
