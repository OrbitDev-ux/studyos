import { Wrench } from "lucide-react";
import { getSetting, SETTING_KEYS } from "@/lib/admin/settings";

export const metadata = {
  title: "점검 중",
  robots: { index: false, follow: false },
};

// Always render fresh so toggling maintenance off is reflected immediately.
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const message = await getSetting<string>(SETTING_KEYS.MAINTENANCE_MESSAGE);

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="bg-foreground text-background flex size-14 items-center justify-center rounded-2xl">
        <Wrench className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">서비스 점검 중</h1>
        <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      </div>
    </div>
  );
}
