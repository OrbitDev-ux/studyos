import { AddFriendForm } from "@/features/social/components/add-friend-form";
import { ConversationList } from "@/features/social/components/conversation-list";
import { FriendList } from "@/features/social/components/friend-list";
import { FriendRequestList } from "@/features/social/components/friend-request-list";
import {
  getConversations,
  getFriends,
  getReceivedFriendRequests,
} from "@/features/social/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function SocialPage() {
  const user = await requireCurrentUser();

  const [friends, requests, conversations] = await Promise.all([
    getFriends(user.id),
    getReceivedFriendRequests(user.id),
    getConversations(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).social;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <AddFriendForm />
      </div>

      {requests.length > 0 && <FriendRequestList requests={requests} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <FriendList friends={friends} t={t} />
        <ConversationList conversations={conversations} currentUserId={user.id} t={t} />
      </div>
    </div>
  );
}
