"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateMyDevSettings } from "@/features/dev/actions";
import {
  EDITOR_THEMES,
  IDLE_TIMEOUT_MINUTES_MAX,
  IDLE_TIMEOUT_MINUTES_MIN,
  SHELLS,
  TERMINAL_FONT_SIZE_MAX,
  TERMINAL_FONT_SIZE_MIN,
  TERMINAL_THEMES,
  type DevSettings,
} from "@/features/dev/config";
import { useI18n } from "@/features/i18n/provider";

/**
 * Real, persisted user preferences (§31) — every field maps 1:1 to the
 * server-whitelisted `devSettingsSchema`; there is no free-form field a user
 * could use to inject arbitrary container configuration.
 */
export function DevSettingsForm({ initial }: { initial: DevSettings }) {
  const { messages } = useI18n();
  const t = messages.dev;
  const [settings, setSettings] = useState<DevSettings>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof DevSettings>(key: K, value: DevSettings[K]) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateMyDevSettings(settings);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  const themeLabel = (theme: string) => (theme === "dark" ? t.themeDark : t.themeLight);

  return (
    <div className="flex max-w-md flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dev-font-size">{t.settingsTerminalFontSize}</Label>
        <Input
          id="dev-font-size"
          type="number"
          min={TERMINAL_FONT_SIZE_MIN}
          max={TERMINAL_FONT_SIZE_MAX}
          value={settings.terminalFontSize}
          onChange={(e) => set("terminalFontSize", Number(e.target.value))}
          className="w-24 font-mono"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label>{t.settingsTerminalTheme}</Label>
        <Select
          value={settings.terminalTheme}
          onValueChange={(v) => set("terminalTheme", v as DevSettings["terminalTheme"])}
        >
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TERMINAL_THEMES.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {themeLabel(theme)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label>{t.settingsShell}</Label>
        <Select value={settings.shell} onValueChange={(v) => set("shell", v as DevSettings["shell"])}>
          <SelectTrigger className="w-32 font-mono"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SHELLS.map((shell) => (
              <SelectItem key={shell} value={shell} className="font-mono">
                {shell}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dev-autostart">{t.settingsAutoStart}</Label>
        <Switch
          id="dev-autostart"
          checked={settings.autoStart}
          onCheckedChange={(v) => set("autoStart", v)}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dev-idle-timeout">{t.settingsIdleTimeout}</Label>
        <Input
          id="dev-idle-timeout"
          type="number"
          min={IDLE_TIMEOUT_MINUTES_MIN}
          max={IDLE_TIMEOUT_MINUTES_MAX}
          value={settings.idleTimeoutMinutes}
          onChange={(e) => set("idleTimeoutMinutes", Number(e.target.value))}
          className="w-24 font-mono"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label>{t.settingsEditorTheme}</Label>
        <Select
          value={settings.editorTheme}
          onValueChange={(v) => set("editorTheme", v as DevSettings["editorTheme"])}
        >
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EDITOR_THEMES.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {themeLabel(theme)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dev-word-wrap">{t.settingsWordWrap}</Label>
        <Switch
          id="dev-word-wrap"
          checked={settings.wordWrap}
          onCheckedChange={(v) => set("wordWrap", v)}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dev-minimap">{t.settingsMinimap}</Label>
        <Switch
          id="dev-minimap"
          checked={settings.minimap}
          onCheckedChange={(v) => set("minimap", v)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending} className="self-start">
          {t.settingsSave}
        </Button>
        {saved && <p className="text-success text-sm">{t.settingsSaved}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </div>
  );
}
