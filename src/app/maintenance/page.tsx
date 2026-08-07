import { getMaintenance } from "@/lib/maintenance";

export const metadata = {
  title: "서비스 점검 중",
  robots: { index: false, follow: false },
};

// Always render fresh so toggling maintenance off is reflected immediately.
export const dynamic = "force-dynamic";

const DEFAULT_TITLE = "서비스 점검 중";
const DEFAULT_MESSAGE = "현재 StudyOS는 점검 중입니다.";

export default async function MaintenancePage() {
  const { title, message } = await getMaintenance();

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="text-5xl sm:text-6xl">🚧</div>
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title?.trim() || DEFAULT_TITLE}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm whitespace-pre-line sm:text-base">
          {message?.trim() || DEFAULT_MESSAGE}
        </p>
      </div>
      <p className="text-muted-foreground text-sm">잠시 후 다시 접속해 주세요.</p>
    </div>
  );
}
