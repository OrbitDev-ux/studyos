import {
  Bell,
  CircleUser,
  KeyRound,
  ScrollText,
  ShieldAlert,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityList } from "@/features/admin/components/activity-list";
import { LoginExperience } from "@/features/login-experience/login-experience";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatTile } from "@/features/admin/components/stat-tile";
import {
  getDashboardStats,
  getRecentActivity,
  getRecentErrors,
} from "@/features/admin/queries";
import { requireAdmin } from "@/lib/admin/context";
import { ROLE_LABELS } from "@/lib/admin/permissions";

export const metadata = {
  robots: { index: false, follow: false },
};

const QUICK_ACTIONS = [
  { label: "새 공지 작성", href: "/admin/announcements?new=1", icon: Bell },
  { label: "사용자 관리", href: "/admin/users", icon: Users },
  { label: "점검모드", href: "/admin/system", icon: Wrench },
  { label: "로그 보기", href: "/admin/logs", icon: ScrollText },
];

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [stats, activity, errors] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
    getRecentErrors(5),
  ]);

  return (
    <>
      <LoginExperience role="admin" />
      <AdminPageHeader
        title={`안녕하세요, ${admin.name ?? "관리자"}님`}
        description={`${ROLE_LABELS[admin.role]} 권한으로 접속했습니다.`}
      />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="h-auto justify-start gap-2 py-2.5"
          >
            <Link href={action.href}>
              <action.icon className="size-4" />
              <span className="truncate">{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="전체 사용자" value={stats.totalUsers} icon={Users} />
        <StatTile
          label="오늘 가입자"
          value={stats.todaySignups}
          icon={UserPlus}
          accent="success"
        />
        <StatTile
          label="활성 사용자 (7일)"
          value={stats.activeUsers}
          icon={UserCheck}
          hint="최근 7일 내 학습 기록"
        />
        <StatTile label="관리자 수" value={stats.adminCount} icon={UserCog} />
        <StatTile label="최근 로그인 (24h)" value={stats.recentLogins} icon={KeyRound} />
        <StatTile
          label="정지된 사용자"
          value={stats.bannedUsers}
          icon={CircleUser}
          accent={stats.bannedUsers > 0 ? "warning" : "default"}
        />
      </div>

      {/* Activity + errors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="text-muted-foreground size-4" />
              최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList rows={activity} emptyLabel="아직 활동 기록이 없습니다." />
            <div className="pt-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/admin/logs">전체 로그 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="text-destructive size-4" />
              최근 오류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList rows={errors} emptyLabel="기록된 오류가 없습니다." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
