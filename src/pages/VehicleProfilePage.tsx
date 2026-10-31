import { ArrowLeft, Gauge } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TagliandoPanel } from "../components/vehicle/TagliandoPanel";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useT } from "../i18n";
import { getVehicleProfile, setVehicleOdometer, updateVehicle } from "../lib/api";
import { trackGlow } from "../lib/glow";
import { formatKm } from "../lib/maintenance";
import { FUEL_TYPES, type FuelType, type VehicleOdometer, type VehicleProfile } from "../lib/types";

const CARD =
  "glow float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-5 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";
const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

const formatDay = (value: string) => {
  // a bare date (YYYY-MM-DD) is a calendar day, not an instant: read it as that day, not as midnight UTC
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return date.toLocaleDateString("es-AR");
};

/** "85.000" or "85000" → 85000; null for anything that is not a whole number of km. */
function parseKm(value: string): number | null {
  const trimmed = value.trim().replace(/\./g, "");
  return /^\d{1,7}$/.test(trimmed) ? Number(trimmed) : null;
}

/** The vehicle's profile: its data and its km, and (with the section) its maintenance. */
export function VehicleProfilePage() {
  const { id = "" } = useParams();
  // Another vehicle starts from scratch: nothing of the previous one stays on screen while it loads.
  return <ProfileView key={id} id={id} />;
}

function ProfileView({ id }: { id: string }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { refetch } = useFleet();
  const [profile, setProfile] = useState<VehicleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";
  // Same rule as the server: a client edits the vehicles of their flota with the Vehículos section.
  const canEdit = isAdmin || (!!currentUser?.allowedArea && !!currentUser.modules.includes("vehiculos"));
  const canSetKm = canEdit || currentUser?.role === "manager";
  const canSeeMaintenance = isAdmin || !!currentUser?.modules.includes("mantenimiento");
  const tab = params.get("tab") === "mantenimiento" && canSeeMaintenance ? "mantenimiento" : "perfil";

  const load = useCallback(() => {
    getVehicleProfile(id)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("vehicleProfile.notFound")))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const vehicle = profile?.vehicle;
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        to="/vehiculos"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("vehicleProfile.back")}
      </Link>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}
      {!loading && (error || !vehicle) && <p className="text-sm text-red-600 dark:text-red-400">{error ?? t("vehicleProfile.notFound")}</p>}

      {vehicle && profile && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{vehicle.name}</h1>
            {vehicle.plate && vehicle.plate !== vehicle.name && (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {vehicle.plate}
              </span>
            )}
            {vehicle.fleetGroup && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                {vehicle.fleetGroup}
              </span>
            )}
          </div>

          {canSeeMaintenance && (
            <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-white/10" role="tablist">
              {(["perfil", "mantenimiento"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setParams(key === "perfil" ? {} : { tab: key }, { replace: true })}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                    tab === key
                      ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {t(key === "perfil" ? "vehicleProfile.tabProfile" : "vehicleProfile.tabMaintenance")}
                </button>
              ))}
            </div>
          )}

          {tab === "perfil" && (
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <OdometerCard key={profile.odometer.mode} vehicleId={vehicle.id} odometer={profile.odometer} canSet={canSetKm} onChanged={load} />
              </div>
              <div className="lg:col-span-3">
                <DataCard
                  key={vehicle.id}
                  profile={profile}
                  canEdit={canEdit}
                  onSaved={() => {
                    load();
                    refetch();
                  }}
                />
              </div>
            </div>
          )}
          {tab === "mantenimiento" && <TagliandoPanel vehicleId={vehicle.id} />}
        </>
      )}
    </div>
  );
}

/** What the current km are and how they are kept: by themselves (GPS counts on from the km typed) or by hand. */
function OdometerCard({
  vehicleId,
  odometer,
  canSet,
  onChanged,
}: {
  vehicleId: string;
  odometer: VehicleOdometer;
  canSet: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState(odometer.mode);
  const [km, setKm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function goAuto() {
    setSaving(true);
    setMessage(null);
    try {
      await setVehicleOdometer(vehicleId, { mode: "auto" });
      onChanged();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("vehicleProfile.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const typed = km.trim() === "" ? undefined : parseKm(km);
    if (typed === null) return setMessage({ ok: false, text: t("vehicleProfile.kmInvalid") });
    setSaving(true);
    setMessage(null);
    try {
      const saved = await setVehicleOdometer(vehicleId, { mode, ...(typed !== undefined ? { km: typed } : {}) });
      setKm("");
      setMessage(
        saved.factorResult === "updated"
          ? { ok: true, text: t("vehicleProfile.factorUpdated", { factor: saved.kmFactor.toLocaleString("es-AR") }) }
          : saved.factorResult === "outOfRange"
            ? { ok: false, text: t("vehicleProfile.factorOutOfRange") }
            : { ok: true, text: t("vehicleProfile.kmSaved") },
      );
      onChanged();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("vehicleProfile.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  const source =
    odometer.source === "manual"
      ? t("vehicleProfile.sourceManual")
      : odometer.source === "obd"
        ? t("vehicleProfile.sourceObd")
        : odometer.source === "gps" && odometer.baseKm !== null && odometer.baseAt
          ? t("vehicleProfile.sourceGps", {
              base: formatKm(odometer.baseKm),
              date: formatDay(odometer.baseAt),
              since: formatKm(odometer.gpsKmSinceBase ?? 0),
            })
          : t("vehicleProfile.sourceNone");

  return (
    <section onMouseMove={trackGlow} className={CARD}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Gauge className="h-4 w-4 text-slate-400" />
        {t("vehicleProfile.kmTitle")}
      </h2>
      <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {odometer.km !== null ? formatKm(odometer.km) : <span className="text-xl text-slate-400">{t("vehicleProfile.kmUnknown")}</span>}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{source}</p>
      {odometer.mode === "manual" && odometer.trackerKm === null && odometer.km !== null && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <p>{t("vehicleProfile.manualNoChange")}</p>
          {canSet && (
            <button type="button" disabled={saving} onClick={() => void goAuto()} className="mt-1 font-medium underline hover:no-underline disabled:opacity-50">
              {t("vehicleProfile.goAuto")}
            </button>
          )}
        </div>
      )}
      {odometer.needsCheck && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t("vehicleProfile.recheck", { days: odometer.daysSinceBase ?? 0 })}
        </p>
      )}
      {odometer.mode === "manual" && odometer.trackerKm !== null && (
        <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
          {t("vehicleProfile.vehicleReads", { km: formatKm(Math.max(0, odometer.trackerKm + odometer.offsetKm)) })}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        {odometer.gpsCoverageFrom
          ? t("vehicleProfile.gpsCount", { km: formatKm(odometer.gpsKmTotal), date: formatDay(odometer.gpsCoverageFrom) })
          : t("vehicleProfile.gpsNone")}
      </p>

      {odometer.source === "gps" && odometer.baseAt && odometer.daysSinceBase !== null && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {t("vehicleProfile.lastAdjust", { date: formatDay(odometer.baseAt), days: odometer.daysSinceBase })}
          {odometer.kmFactor !== 1 && ` ${t("vehicleProfile.factor", { factor: odometer.kmFactor.toLocaleString("es-AR") })}`}
        </p>
      )}

      {canSet && (
        <form onSubmit={save} className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="mb-2 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="group">
            {(["auto", "manual"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  mode === key
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {t(key === "auto" ? "vehicleProfile.modeAuto" : "vehicleProfile.modeManual")}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {t(mode === "auto" ? "vehicleProfile.modeAutoHint" : "vehicleProfile.modeManualHint")}
          </p>
          <label className={LABEL} htmlFor="profile-km">
            {t("vehicleProfile.kmInput")}
          </label>
          <div className="flex gap-2">
            <input
              id="profile-km"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder={odometer.km?.toString() ?? "85000"}
              className={INPUT}
            />
            <button type="submit" disabled={saving} className="brand-button shrink-0 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {t("common.save")}
            </button>
          </div>
          {message && (
            <p className={`mt-2 text-sm ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>
          )}
        </form>
      )}
    </section>
  );
}

/** The vehicle's data: what it is, beyond its name and plate. */
function DataCard({ profile, canEdit, onSaved }: { profile: VehicleProfile; canEdit: boolean; onSaved: () => void }) {
  const t = useT();
  const { vehicle } = profile;
  const { devices } = useFleet();
  const imei = vehicle.deviceId ? (devices.find((d) => d.id === vehicle.deviceId)?.imei ?? null) : null;
  const [name, setName] = useState(vehicle.name);
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [brand, setBrand] = useState(vehicle.brand ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [year, setYear] = useState(vehicle.year?.toString() ?? "");
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [fuelType, setFuelType] = useState<FuelType | "">(vehicle.fuelType ?? "");
  const [color, setColor] = useState(vehicle.color ?? "");
  const [notes, setNotes] = useState(vehicle.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const yearNumber = year.trim() === "" ? null : Number(year);
    if (yearNumber !== null && (!Number.isInteger(yearNumber) || yearNumber < 1950 || yearNumber > 2100)) {
      return setMessage({ ok: false, text: t("vehicleProfile.saveFailed") });
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateVehicle(vehicle.id, {
        name,
        ...(plate.trim() ? { plate: plate.trim() } : {}),
        brand: brand.trim() || null,
        model: model.trim() || null,
        year: yearNumber,
        vin: vin.trim() || null,
        fuelType: fuelType || null,
        color: color.trim() || null,
        notes: notes.trim() || null,
      });
      setMessage({ ok: true, text: t("vehicleProfile.saved") });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("vehicleProfile.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, extra: { max?: number; inputMode?: "numeric"; placeholder?: string } = {}) => (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        disabled={!canEdit}
        maxLength={extra.max}
        inputMode={extra.inputMode}
        placeholder={extra.placeholder}
        className={`${INPUT} disabled:opacity-70`}
      />
    </div>
  );

  return (
    <form onSubmit={save} onMouseMove={trackGlow} className={CARD}>
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{t("vehicleProfile.dataTitle")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("vp-name", t("common.name"), name, setName, { max: 100 })}
        {field("vp-plate", t("common.plate"), plate, setPlate, { max: 20 })}
        {field("vp-brand", t("vehicleProfile.brand"), brand, setBrand, { max: 50 })}
        {field("vp-model", t("vehicleProfile.model"), model, setModel, { max: 50 })}
        {field("vp-year", t("vehicleProfile.year"), year, setYear, { max: 4, inputMode: "numeric", placeholder: "2021" })}
        {field("vp-vin", t("vehicleProfile.vin"), vin, setVin, { max: 30 })}
        <div>
          <label className={LABEL} htmlFor="vp-fuel">
            {t("vehicleProfile.fuel")}
          </label>
          <select
            id="vp-fuel"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as FuelType | "")}
            disabled={!canEdit}
            className={`${INPUT} disabled:opacity-70`}
          >
            <option value="">{t("vehicleProfile.fuelNone")}</option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {t(`vehicleProfile.fuel.${fuel}`)}
              </option>
            ))}
          </select>
        </div>
        {field("vp-color", t("vehicleProfile.color"), color, setColor, { max: 30 })}
      </div>

      <div className="mt-3">
        <label className={LABEL} htmlFor="vp-notes">
          {t("vehicleProfile.notes")}
        </label>
        <textarea
          id="vp-notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canEdit}
          placeholder={t("vehicleProfile.notesPlaceholder")}
          className={`${INPUT} disabled:opacity-70`}
        />
      </div>

      <dl className="mt-4 grid gap-1 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 dark:border-white/10">
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-slate-400 dark:text-slate-500">{t("common.device")}</dt>
          <dd className="text-slate-700 dark:text-slate-300">{imei ?? t("vehiclesPage.unassigned")}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-slate-400 dark:text-slate-500">{t("common.fleet")}</dt>
          <dd className="text-slate-700 dark:text-slate-300">{vehicle.fleetGroup ?? "—"}</dd>
        </div>
      </dl>

      {canEdit && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {message && (
            <p className={`text-sm ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>
          )}
          <button type="submit" disabled={saving} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {t("common.save")}
          </button>
        </div>
      )}
    </form>
  );
}
