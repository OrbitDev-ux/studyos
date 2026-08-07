import { Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  AnnouncementRowActions,
  NewAnnouncementButton,
} from "@/features/admin/components/announcement-controls";
import { Markdown } from "@/features/admin/components/markdown";
import { formatDateTime } from "@/features/admin/format";
import {
  getAnnouncements,
  type AnnouncementStatus,
} from "@/features/admin/announcements-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

const STATUS: Record<
  AnnouncementStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  published: { label: "게시됨", variant: "default" },
  scheduled: { label: "예약됨", variant: "secondary" },
  draft: { label: "임시저장", variant: "outline" },
};

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireCapability("manageAnnouncements");
  const { new: isNew } = await searchParams;
  const announcements = await getAnnouncements();

  return (
    <>
      <AdminPageHeader
        title="공지 관리"
        description={`${announcements.length}개의 공지`}
        action={<NewAnnouncementButton defaultOpen={isNew === "1"} />}
      />

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            아직 작성된 공지가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => {
            const status = STATUS[a.status];
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2 border-b px-(--card-spacing) pb-(--card-spacing)">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2 font-medium">
                      {a.isPinned && <Pin className="size-3.5 shrink-0 -rotate-45" />}
                      <span className="truncate">{a.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {a.status === "scheduled" && a.scheduledAt && (
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(a.scheduledAt)} 게시 예정
                        </span>
                      )}
                      {a.status === "published" && a.publishedAt && (
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(a.publishedAt)}
                        </span>
                      )}
                      {a.authorName && (
                        <span className="text-muted-foreground text-xs">
                          · {a.authorName}
                        </span>
                      )}
                    </div>
                  </div>
                  <AnnouncementRowActions announcement={a} />
                </div>
                <CardContent>
                  <Markdown
                    content={a.body}
                    className="text-muted-foreground line-clamp-4"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
