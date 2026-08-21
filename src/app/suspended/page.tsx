import { Ban } from "lucide-react";
import { CONTACT_EMAIL } from "@/config/site";

export const metadata = {
  title: "이용 영구 정지",
  robots: { index: false, follow: false },
};

export default function SuspendedPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <Ban className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">이용이 정지된 계정입니다</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          현재 계정의 서비스 이용이 제한되었습니다. 문의가 필요하시면 아래로 연락해
          주세요.
        </p>
        <p className="text-sm font-medium">{CONTACT_EMAIL}</p>
      </div>
    </div>
  );
}
