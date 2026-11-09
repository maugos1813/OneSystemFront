import { useEffect, useState, type ReactNode } from "react";
import { Panel } from "../components/analytics/Panel";
import { LogoUpload } from "../components/LogoUpload";
import { SecurityPanel } from "../components/security/SecurityPanel";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useT, type MessageKey } from "../i18n";
import { MODULE_INFO, visibleModules } from "../lib/modules";
import { updateSettings } from "../lib/api";
import type { AlertPreferences, OrgSettings, WeekdayKey, WorkingHoursDay } from "../lib/types";

const DAYS: Array<{ key: WeekdayKey; label: MessageKey }> = [
  { key: "monday", label: "day.monday" },
  { key: "tuesday", label: "day.tuesday" },
  { key: "wednesday", label: "day.wednesday" },
  { key: "thursday", label: "day.thursday" },
  { key: "friday", label: "day.friday" },
  { key: "saturday", label: "day.saturday" },
  { key: "sunday", label: "day.sunday" },
];

function AlertRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="brand-range h-4 w-4 shrink-0"
        />
        {label}
      </label>
      <div className={`text-sm text-slate-500 sm:pl-4 dark:text-slate-400 ${enabled ? "" : "opacity-40"}`}>
        {children}
      </div>
    </div>
  );
}

function NumberField({
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="field-input w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
      />
      {suffix}
    </span>
  );
}

const ROLE_LABEL: Record<string, MessageKey> = { owner: "role.owner", admin: "role.admin", manager: "role.manager", viewer: "role.viewer" };
const LANGUAGE_LABEL: Record<string, string> = { es: "Español", it: "Italiano" };

/** Who is signed in: their account and what it can see. Everyone has it, whatever their role. */
function ProfilePanel() {
  const t = useT();
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const photo = currentUser.userLogo ?? currentUser.orgLogo;
  const name = currentUser.name.trim() || currentUser.orgName;
  const sections = visibleModules(currentUser.modules);
  const rows: Array<[string, string]> = [
    [t("settings.company"), currentUser.orgName],
    [t("settings.fleet"), currentUser.allowedArea ? currentUser.allowedArea : t("settings.allFleets")],
    [t("settings.language"), LANGUAGE_LABEL[currentUser.language] ?? currentUser.language],
  ];

  return (
    <Panel title={t("settings.profile")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white p-1 ring-1 ring-slate-200 dark:ring-white/10">
            {photo ? (
              <img src={photo} alt={name} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="brand-gradient flex h-full w-full items-center justify-center rounded-2xl text-3xl font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{name}</p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{currentUser.email}</p>
            <span className="mt-1.5 inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {ROLE_LABEL[currentUser.role] ? t(ROLE_LABEL[currentUser.role]) : currentUser.role}
            </span>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{label}</p>
              <p className="text-sm text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("settings.sections")}</p>
            <div className="flex flex-wrap gap-1.5">
              {sections.length === 0 && <span className="text-sm text-slate-500 dark:text-slate-400">{t("settings.none")}</span>}
              {sections.map((key) => (
                <span key={key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {t(MODULE_INFO[key].label)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function SettingsPage() {
  const t = useT();
  const { settings, refetchSettings } = useFleet();
  const { currentUser, refreshUser } = useAuth();
  const [form, setForm] = useState<OrgSettings | null>(null);
  // undefined: the logo wasn't touched, so the saved one stays.
  const [logoDraft, setLogoDraft] = useState<string | null | undefined>(undefined);
  // The small copy of the new logo, for the map's plate tags.
  const [logoTagDraft, setLogoTagDraft] = useState<string | null>(null);
  const logo = logoDraft === undefined ? (currentUser?.orgLogo ?? null) : logoDraft;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  // The company's settings (name, logo, hours, alerts) are for owner/admin (and OneSystec may leave them out for a client);
  // "Mi perfil" is for everyone.
  const canEditCompany = (currentUser?.role === "owner" || currentUser?.role === "admin") && (currentUser.adminSections?.includes("ajustes") ?? true);

  if (!form && canEditCompany) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">{t("common.loading")}</div>
    );
  }

  function updateDay(day: WeekdayKey, patch: Partial<WorkingHoursDay>) {
    setForm((f) => f && { ...f, workingHours: { ...f.workingHours, [day]: { ...f.workingHours[day], ...patch } } });
  }

  function updateAlert<K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) {
    setForm((f) => f && { ...f, alerts: { ...f.alerts, [key]: value } });
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await updateSettings({
        orgName: form.orgName,
        ...(logoDraft !== undefined ? { orgLogo: logoDraft, orgLogoTag: logoDraft === null ? null : logoTagDraft } : {}),
        workingHours: form.workingHours,
        alerts: form.alerts,
      });
      refetchSettings();
      await refreshUser();
      setLogoDraft(undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("settings.title")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t(canEditCompany ? "settings.introAdmin" : "settings.intro")}
      </p>

      <div className="mb-6">
        <ProfilePanel />
      </div>

      <div className="mb-6">
        <SecurityPanel />
      </div>

      {form && canEditCompany && (
      <>
      <div className="gap-6 xl:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
        <Panel title={t("settings.company")}>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.name")}</label>
          <input
            value={form.orgName}
            onChange={(e) => setForm((f) => f && { ...f, orgName: e.target.value })}
            className="field-input w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <label className="mt-4 mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.logo")}</label>
          <LogoUpload
            value={logo}
            onChange={(next, tag) => {
              setLogoDraft(next);
              setLogoTagDraft(tag ?? null);
            }}
            name={form.orgName}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t("settings.logoHint")}
          </p>
        </Panel>

        <Panel title={t("settings.hours")}>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = form.workingHours[key];
              return (
                <div
                  key={key}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 sm:flex sm:items-center sm:gap-3 sm:py-2 dark:bg-white/5"
                >
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 sm:mb-0 sm:w-28 sm:shrink-0 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                      className="brand-range h-4 w-4 shrink-0"
                    />
                    {t(label)}
                  </label>
                  <div className="flex items-center gap-2 pl-6 sm:pl-0">
                    <input
                      type="time"
                      value={day.start}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(key, { start: e.target.value })}
                      className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-40 sm:flex-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">{t("settings.to")}</span>
                    <input
                      type="time"
                      value={day.end}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(key, { end: e.target.value })}
                      className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-40 sm:flex-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title={t("settings.alertPrefs")}>
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            <AlertRow
              label={t("settings.afterHours")}
              enabled={form.alerts.afterHoursEnabled}
              onToggle={(v) => updateAlert("afterHoursEnabled", v)}
            >
              {t("settings.afterHoursHint")}
            </AlertRow>
            <AlertRow
              label={t("settings.deviceOffline")}
              enabled={form.alerts.deviceOfflineEnabled}
              onToggle={(v) => updateAlert("deviceOfflineEnabled", v)}
            >
              <NumberField
                value={form.alerts.deviceOfflineHours}
                onChange={(v) => updateAlert("deviceOfflineHours", v)}
                suffix={t("settings.hoursNoReport")}
                min={0.5}
                max={72}
                step={0.5}
              />
            </AlertRow>
            <AlertRow
              label={t("settings.lowBattery")}
              enabled={form.alerts.lowBatteryEnabled}
              onToggle={(v) => updateAlert("lowBatteryEnabled", v)}
            >
              <NumberField
                value={form.alerts.lowBatteryVoltage}
                onChange={(v) => updateAlert("lowBatteryVoltage", v)}
                suffix={t("settings.voltMin")}
                min={6}
                max={30}
                step={0.1}
              />
            </AlertRow>
            <AlertRow
              label={t("settings.speeding")}
              enabled={form.alerts.speedingEnabled}
              onToggle={(v) => updateAlert("speedingEnabled", v)}
            >
              <NumberField
                value={form.alerts.speedLimitKmh}
                onChange={(v) => updateAlert("speedLimitKmh", v)}
                suffix={t("settings.kmhLimit")}
                min={10}
                max={300}
              />
            </AlertRow>
            <AlertRow
              label={t("settings.idling")}
              enabled={form.alerts.excessiveIdlingEnabled}
              onToggle={(v) => updateAlert("excessiveIdlingEnabled", v)}
            >
              <NumberField
                value={form.alerts.excessiveIdlingMinutes}
                onChange={(v) => updateAlert("excessiveIdlingMinutes", v)}
                suffix={t("settings.minutes")}
                min={1}
                max={240}
              />
            </AlertRow>
            <AlertRow
              label={t("settings.geofences")}
              enabled={form.alerts.geofenceEnabled}
              onToggle={(v) => updateAlert("geofenceEnabled", v)}
            >
              {t("settings.geofencesHint")}
            </AlertRow>
            <AlertRow
              label={t("settings.gpsDisconnect")}
              enabled={form.alerts.gpsDisconnectEnabled}
              onToggle={(v) => updateAlert("gpsDisconnectEnabled", v)}
            >
              <div className="flex flex-col gap-2">
                <p className="max-w-md">
                  {t("settings.gpsDisconnectHint")}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <NumberField
                    value={form.alerts.gpsDisconnectSilenceMinutes}
                    onChange={(v) => updateAlert("gpsDisconnectSilenceMinutes", v)}
                    suffix={t("settings.minNoData")}
                    min={5}
                    max={240}
                  />
                  <NumberField
                    value={form.alerts.gpsDisconnectReminderMinutes}
                    onChange={(v) => updateAlert("gpsDisconnectReminderMinutes", v)}
                    suffix={t("settings.minBetweenReminders")}
                    min={5}
                    max={120}
                  />
                </div>
              </div>
            </AlertRow>
            <AlertRow
              label={t("settings.deviceAlarms")}
              enabled={form.alerts.deviceAlarmsEnabled}
              onToggle={(v) => updateAlert("deviceAlarmsEnabled", v)}
            >
              {t("settings.deviceAlarmsHint")}
            </AlertRow>
            <AlertRow
              label={t("settings.maintenance")}
              enabled={form.alerts.maintenanceEnabled}
              onToggle={(v) => updateAlert("maintenanceEnabled", v)}
            >
              {t("settings.maintenanceHint")}
            </AlertRow>
          </div>
        </Panel>

      </div>
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="brand-button rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">{t("settings.saved")}</span>}
        </div>
      </>
      )}
    </div>
  );
}
