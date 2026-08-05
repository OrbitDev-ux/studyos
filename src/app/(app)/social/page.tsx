import { AddFriendForm } from "@/features/social/components/add-friend-form";
import { ConversationList } from "@/features/social/components/conversation-list";
import { FriendList } from "@/features/social/components/friend-list";
import { FriendRequestList } from "@/features/social/components/friend-request-list";
import {
  getConversations,
  getFriends,
  getReceivedFriendRequests,
} from "@/features/social/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function SocialPage() {
  const user = await requireCurrentUser();

  const [friends, requests, conversations] = await Promise.all([
    getFriends(user.id),
    getReceivedFriendRequests(user.id),
    getConversations(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">친구</h1>
        <AddFriendForm />
      </div>

      {requests.length > 0 && <FriendRequestList requests={requests} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <FriendList friends={friends} />
        <ConversationList conversations={conversations} currentUserId={user.id} />
      </div>
    </div>
  );
}
