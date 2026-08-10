import { redirect } from "next/navigation";

// The full 이용약관 now lives at /legal/terms (single source: features/legal).
// Kept as a permanent redirect so existing links / bookmarks still work.
export default function TermsRedirect() {
  redirect("/legal/terms");
}
