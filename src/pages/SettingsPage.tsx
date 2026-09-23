import { useEffect, useState, type ReactNode } from "react";
import { Panel } from "../components/analytics/Panel";
import { useFleet } from "../context/FleetContext";
import { updateSettings } from "../lib/api";
import type { AlertPreferences, OrgSettings, WeekdayKey, WorkingHoursDay } from "../lib/types";

const DAYS: Array<{ key: WeekdayKey; label: string }> = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
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
      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="brand-range h-4 w-4 shrink-0"
        />
        {label}
      </label>
      <div className={`text-sm text-slate-500 sm:pl-4 ${enabled ? "" : "opacity-40"}`}>{children}</div>
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
        className="field-input w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      {suffix}
    </span>
  );
}

export function SettingsPage() {
  const { settings, refetchSettings } = useFleet();
  const [form, setForm] = useState<OrgSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando...</div>;
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
      await updateSettings({ orgName: form.orgName, workingHours: form.workingHours, alerts: form.alerts });
      refetchSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Ajustes</h1>
      <p className="mb-6 text-sm text-slate-500">Empresa, horario laboral y preferencias de alertas.</p>

      <div className="max-w-3xl space-y-6">
        <Panel title="Empresa">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            value={form.orgName}
            onChange={(e) => setForm((f) => f && { ...f, orgName: e.target.value })}
            className="field-input w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </Panel>

        <Panel title="Horario laboral">
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = form.workingHours[key];
              return (
                <div
                  key={key}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 sm:flex sm:items-center sm:gap-3 sm:py-2"
                >
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 sm:mb-0 sm:w-28 sm:shrink-0">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                      className="brand-range h-4 w-4 shrink-0"
                    />
                    {label}
                  </label>
                  <div className="flex items-center gap-2 pl-6 sm:pl-0">
                    <input
                      type="time"
                      value={day.start}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(key, { start: e.target.value })}
                      className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-40 sm:flex-none"
                    />
                    <span className="shrink-0 text-sm text-slate-400">a</span>
                    <input
                      type="time"
                      value={day.end}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(key, { end: e.target.value })}
                      className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-40 sm:flex-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Preferencias de alertas">
          <div className="divide-y divide-slate-100">
            <AlertRow
              label="Uso fuera de horario laboral"
              enabled={form.alerts.afterHoursEnabled}
              onToggle={(v) => updateAlert("afterHoursEnabled", v)}
            >
              Usa el horario laboral configurado arriba.
            </AlertRow>
            <AlertRow
              label="Dispositivo desconectado"
              enabled={form.alerts.deviceOfflineEnabled}
              onToggle={(v) => updateAlert("deviceOfflineEnabled", v)}
            >
              <NumberField
                value={form.alerts.deviceOfflineHours}
                onChange={(v) => updateAlert("deviceOfflineHours", v)}
                suffix="horas sin reportar"
                min={0.5}
                max={72}
                step={0.5}
              />
            </AlertRow>
            <AlertRow
              label="Batería del dispositivo baja"
              enabled={form.alerts.lowBatteryEnabled}
              onToggle={(v) => updateAlert("lowBatteryEnabled", v)}
            >
              <NumberField
                value={form.alerts.lowBatteryVoltage}
                onChange={(v) => updateAlert("lowBatteryVoltage", v)}
                suffix="V mínimo"
                min={6}
                max={30}
                step={0.1}
              />
            </AlertRow>
            <AlertRow
              label="Exceso de velocidad"
              enabled={form.alerts.speedingEnabled}
              onToggle={(v) => updateAlert("speedingEnabled", v)}
            >
              <NumberField
                value={form.alerts.speedLimitKmh}
                onChange={(v) => updateAlert("speedLimitKmh", v)}
                suffix="km/h límite"
                min={10}
                max={300}
              />
            </AlertRow>
            <AlertRow
              label="Motor encendido, vehículo detenido"
              enabled={form.alerts.excessiveIdlingEnabled}
              onToggle={(v) => updateAlert("excessiveIdlingEnabled", v)}
            >
              <NumberField
                value={form.alerts.excessiveIdlingMinutes}
                onChange={(v) => updateAlert("excessiveIdlingMinutes", v)}
                suffix="min"
                min={1}
                max={240}
              />
            </AlertRow>
            <AlertRow
              label="Entrada/salida de geocercas"
              enabled={form.alerts.geofenceEnabled}
              onToggle={(v) => updateAlert("geofenceEnabled", v)}
            >
              Configurá las zonas en la página Geocercas.
            </AlertRow>
          </div>
        </Panel>

        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="brand-button rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">Guardado ✓</span>}
        </div>
      </div>
    </div>
  );
}
