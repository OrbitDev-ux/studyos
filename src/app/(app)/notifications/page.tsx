import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { getNotifications } from "@/features/notifications/service";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "알림" };

export default async function NotificationsPage() {
  const user = await requireCurrentUser();
  const initial = await getNotifications(user.id, 1);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <NotificationsList initial={initial} />
    </div>
  );
}
