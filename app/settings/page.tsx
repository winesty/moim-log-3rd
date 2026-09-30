import { cookies } from "next/headers";
import SettingsPanel from "@/components/SettingsPanel";
import BackupPanel from "@/components/BackupPanel";
import DangerZonePanel from "@/components/DangerZonePanel";
import { IDLE_COOKIE_NAME, defaultIdleMinutes, resolveIdleMinutes } from "@/lib/authConfig";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const currentMinutes = resolveIdleMinutes(cookies().get(IDLE_COOKIE_NAME)?.value);
  return (
    <div>
      <h1 className="text-xl font-medium mb-4">설정</h1>
      <div className="flex flex-col gap-4">
        <SettingsPanel currentMinutes={currentMinutes} defaultMinutes={defaultIdleMinutes()} />
        <BackupPanel />
        <DangerZonePanel />
      </div>
    </div>
  );
}
