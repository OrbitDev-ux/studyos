import { redirect } from "next/navigation";

// The full 개인정보 처리방침 now lives at /legal/privacy (single source:
// features/legal). Kept as a redirect so existing links / bookmarks still work.
export default function PrivacyRedirect() {
  redirect("/legal/privacy");
}
