import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileQuestion,
  GraduationCap,
  ListTodo,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { UserActionsMenu } from "@/features/admin/components/user-actions-menu";
import { formatDateTime, formatRelative } from "@/features/admin/format";
import { getUserDetail } from "@/features/admin/users-queries";
import { requireAdmin } from "@/lib/admin/context";
import { ROLE_LABELS, can } from "@/lib/admin/permissions";

export const metadata = { robots: { index: false, follow: false } };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await requireAdmin();
  const { userId } = await params;
  const user = await getUserDetail(userId);
  if (!user) notFound();

  const initial = (user.name ?? user.email).at(0)?.toUpperCase() ?? "?";
  const stats = [
    { label: "Todo", value: user.counts.todos, icon: ListTodo },
    { label: "학습 세션", value: user.counts.studySessions, icon: Clock },
    { label: "과목", value: user.counts.subjects, icon: BookOpen },
    { label: "문제", value: user.counts.problems, icon: FileQuestion },
    { label: "모의고사", value: user.counts.mockExams, icon: ScrollText },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="size-4" />
            목록
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title="사용자 상세"
        action={
          <UserActionsMenu
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              isBanned: Boolean(user.bannedAt),
              isAdmin: user.isAdmin,
            }}
            canBan={can(admin.role, "banUser")}
            canPromote={can(admin.role, "promoteUser")}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <Avatar className="size-16">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback className="text-lg">{initial}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name ?? "이름 없음"}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {user.bannedAt ? (
                <Badge variant="destructive">정지됨</Badge>
              ) : (
                <Badge variant="secondary">활성</Badge>
              )}
              {user.isAdmin && user.adminRole && (
                <Badge variant="outline">{ROLE_LABELS[user.adminRole]}</Badge>
              )}
            </div>
            {user.bannedAt && user.banReason && (
              <p className="text-destructive text-xs">사유: {user.banReason}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="text-muted-foreground size-4" />
              계정 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-border divide-y">
              <InfoRow label="이메일" value={user.email} />
              <InfoRow label="학교" value={user.school ?? "—"} />
              <InfoRow label="시간대" value={user.timezone} />
              <InfoRow label="가입일" value={formatDateTime(user.createdAt)} />
              <InfoRow
                label="최근 활동"
                value={
                  user.lastActiveAt ? formatRelative(user.lastActiveAt) : "기록 없음"
                }
              />
              <InfoRow
                label="권한"
                value={
                  user.isAdmin && user.adminRole
                    ? ROLE_LABELS[user.adminRole]
                    : "일반 사용자"
                }
              />
              <InfoRow
                label="상태"
                value={
                  user.bannedAt ? `정지됨 (${formatDateTime(user.bannedAt)})` : "활성"
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <s.icon className="text-muted-foreground size-4" />
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
