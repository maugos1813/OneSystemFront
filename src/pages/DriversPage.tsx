import { Bluetooth, Check, ChevronDown, ChevronRight, Mail, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SUPPORT_EMAIL } from "../components/layout/LoginCard";
import { useAuth } from "../context/AuthContext";
import { useT, type MessageKey } from "../i18n";
import {
  assignDriverBeacon,
  listBeaconsByVehicle,
  listDriverBeacons,
  removeDriverBeacon,
  updateDriverBeacon,
} from "../lib/api";
import { trackGlow } from "../lib/glow";
import { formatRelativeTime } from "../lib/relativeTime";
import type { BeaconInVehicle, DriverBeacon, VehicleBeacons } from "../lib/types";

/** What the name field needs to know about a beacon: whether it is already registered (rename) or not (assign). */
interface Row {
  beaconId: string;
  registeredId: string | null;
  driverName: string | null;
  phone: string | null;
}

const PERIODS: Array<{ label: string; hours: number }> = [
  { label: "24 h", hours: 24 },
  { label: "beacons.days7", hours: 24 * 7 },
  { label: "beacons.days30", hours: 24 * 30 },
];

const kindOf = (beaconId: string): string => (beaconId.startsWith("ibeacon:") ? "iBeacon" : "Eddystone");
const idOf = (beaconId: string): string => beaconId.slice(beaconId.indexOf(":") + 1);

/** The MAC of an EYE Beacon still on its factory identity (zero namespace, MAC as instance); null for any other beacon. */
function factoryMac(beaconId: string): string | null {
  const m = /^eddystone:0{20}-([0-9a-f]{12})$/.exec(beaconId);
  return m ? m[1]!.toUpperCase().replace(/(..)(?=.)/g, "$1:") : null;
}

/** "Eddystone · 7C:D9:F4:0B:39:E3" for an EYE on its factory identity, otherwise the kind and the end of the id. */
const shortLabel = (beaconId: string): string =>
  `${kindOf(beaconId)} · ${factoryMac(beaconId) ?? `…${idOf(beaconId).slice(-10)}`}`;

/** How close a beacon was, from its signal: arm's length is about -50 to -70 dBm, a neighbour's far below that. */
function proximity(rssi: number | null): { label: MessageKey; tone: string } {
  if (rssi === null) return { label: "beacons.noSignal", tone: "text-slate-400" };
  if (rssi >= -75) return { label: "beacons.near", tone: "text-emerald-600 dark:text-emerald-400" };
  if (rssi >= -90) return { label: "beacons.medium", tone: "text-amber-600 dark:text-amber-400" };
  return { label: "beacons.far", tone: "text-slate-400 dark:text-slate-500" };
}

function NameCell({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(row.driverName ?? "");
  const [phone, setPhone] = useState(row.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== (row.driverName ?? "") || phone.trim() !== (row.phone ?? "");

  async function save() {
    if (!name.trim() || !changed) return;
    setSaving(true);
    setError(null);
    try {
      if (row.registeredId)
        await updateDriverBeacon(row.registeredId, { driverName: name.trim(), phone: phone.trim() });
      else await assignDriverBeacon(row.beaconId, name.trim(), phone.trim() || undefined);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("beacons.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={t("beacons.driverName")}
          maxLength={100}
          className="field-input w-44 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={t("beacons.phone")}
          type="tel"
          inputMode="tel"
          maxLength={30}
          aria-label={t("beacons.driverPhone")}
          className="field-input w-36 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {changed && name.trim() && (
          <button
            onClick={save}
            disabled={saving}
            className="brand-button rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {row.registeredId ? t("beacons.save") : t("beacons.assign")}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}


function BeaconLine({
  beacon,
  onSaved,
  onRemove,
}: {
  beacon: BeaconInVehicle;
  onSaved: () => void;
  onRemove?: () => void;
}) {
  const t = useT();
  const near = proximity(beacon.avgRssi);
  const row: Row = {
    beaconId: beacon.beaconId,
    registeredId: beacon.registeredId,
    driverName: beacon.driverName,
    phone: beacon.phone,
  };
  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-2">
        <NameCell key={`${beacon.beaconId}:${beacon.driverName}:${beacon.phone}`} row={row} onSaved={onSaved} />
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={t("beacons.remove")}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono">{shortLabel(beacon.beaconId)}</span>
        <span className="mx-1.5">·</span>
        {t("beacons.lastSeen", { when: formatRelativeTime(beacon.lastSeen, t) })}
        <span className="mx-1.5">·</span>
        <span className={near.tone}>
          {beacon.avgRssi !== null ? `${beacon.avgRssi} dBm` : "—"} ({t(near.label)})
        </span>
        <span className="mx-1.5">·</span>
        {t("beacons.sightings", { count: beacon.sightings })}
        {beacon.ignitionSightings > 0
          ? t("beacons.withIgnition", { count: beacon.ignitionSightings })
          : t("beacons.ignitionOffOnly")}
      </p>
    </li>
  );
}

function VehicleCard({
  entry,
  onSaved,
  onRemove,
}: {
  entry: VehicleBeacons;
  onSaved: () => void;
  onRemove: (beacon: BeaconInVehicle) => void;
}) {
  const t = useT();
  const [openUnnamed, setOpenUnnamed] = useState(false);
  const drivers = entry.beacons.filter((b) => b.driverName !== null);
  const unnamed = entry.beacons.filter((b) => b.driverName === null);
  const unnamedNear = unnamed.filter((b) => b.avgRssi !== null && b.avgRssi >= -75).length;

  return (
    <section
      onMouseMove={trackGlow}
      className="glow float-card mb-4 break-inside-avoid rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {entry.vehicle.plate ?? entry.vehicle.name}
          <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {entry.vehicle.model}
          </span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {entry.lastReport
            ? t("beacons.lastReport", { when: formatRelativeTime(entry.lastReport, t) })
            : t("beacons.noReports")}
        </p>
      </div>

      {!entry.lastReport && (
        <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t("beacons.noReportsWarn")}
        </p>
      )}

      {drivers.length > 0 ? (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {drivers.map((beacon) => (
            <BeaconLine key={beacon.beaconId} beacon={beacon} onSaved={onSaved} onRemove={() => onRemove(beacon)} />
          ))}
        </ul>
      ) : (
        entry.lastReport && (
          <p className="py-2 text-sm text-slate-500 dark:text-slate-400">
            {t("beacons.noDrivers")}
          </p>
        )
      )}

      {unnamed.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-white/10">
          <button
            type="button"
            onClick={() => setOpenUnnamed((o) => !o)}
            aria-expanded={openUnnamed}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {openUnnamed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {t("beacons.unnamed", { count: unnamed.length })}
            {unnamedNear > 0 && <span className="text-emerald-600 dark:text-emerald-400">{t("beacons.unnamedNear", { count: unnamedNear })}</span>}
          </button>
          {openUnnamed && (
            <>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t("beacons.unnamedHint")}
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {unnamed.map((beacon) => (
                  <BeaconLine key={beacon.beaconId} beacon={beacon} onSaved={onSaved} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** What a client without EYE Beacons sees: the service offered, with a button that opens an email to OneSystec asking for information. */
function BeaconOffer() {
  const t = useT();
  const { currentUser } = useAuth();
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("beacons.mailSubject"))}&body=${encodeURIComponent(
    t("beacons.mailBody", { company: currentUser?.orgName ?? "" }),
  )}`;
  const bullets = ["beacons.promoBullet1", "beacons.promoBullet2", "beacons.promoBullet3"] as const;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t("nav.drivers")}</h1>
      <div
        onMouseMove={trackGlow}
        className="glow float-card max-w-2xl rounded-2xl border border-violet-200 bg-violet-50/60 p-5 text-sm text-slate-600 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-slate-300"
      >
        <div className="flex items-start gap-3">
          <Bluetooth className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">{t("beacons.promoTitle")}</p>
            <p className="mt-1">{t("beacons.promoLead")}</p>
            <ul className="mt-3 space-y-1.5">
              {bullets.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <a href={mail} className="brand-button mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              {t("beacons.promoButton")}
            </a>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("beacons.promoHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DriversPage() {
  const t = useT();
  const [hours, setHours] = useState(PERIODS[0]!.hours);
  const [registered, setRegistered] = useState<DriverBeacon[]>([]);
  const [byVehicle, setByVehicle] = useState<VehicleBeacons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    Promise.all([listDriverBeacons(), listBeaconsByVehicle(hours)])
      .then(([reg, vehicles]) => {
        setRegistered(reg);
        setByVehicle(vehicles);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("beacons.loadFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  /** Registered beacons no tracker heard in the period: still listed, so they can be renamed or removed. */
  const silent = useMemo(() => {
    const heard = new Set(byVehicle.flatMap((v) => v.beacons.map((b) => b.beaconId)));
    return registered.filter((r) => !heard.has(r.beaconId));
  }, [registered, byVehicle]);

  async function handleRemove(registeredId: string | null, driverName: string | null) {
    if (!registeredId) return;
    if (!confirm(t("beacons.confirmRemove", { name: driverName ?? "" }))) return;
    await removeDriverBeacon(registeredId);
    refetch();
  }

  // A client with no EYE Beacon handed out yet gets the offer, not the tool: nothing to configure, a way to ask for it.
  if (!loading && !error && registered.length === 0) return <BeaconOffer />;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("nav.drivers")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("beacons.intro")}
      </p>

      <div
        onMouseMove={trackGlow}
        className="glow float-card mb-6 rounded-2xl border border-white bg-white p-4 text-sm text-slate-600 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40"
      >
        <p className="mb-1 font-semibold text-slate-900 dark:text-white">{t("beacons.howTitle")}</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("beacons.how2")}</li>
          <li>{t("beacons.how3")}</li>
        </ol>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-slate-500 dark:text-slate-400">{t("beacons.period")}</span>
        {PERIODS.map((p) => (
          <button
            key={p.hours}
            onClick={() => setHours(p.hours)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              p.hours === hours
                ? "bg-slate-900 text-white dark:bg-blue-600"
                : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            {p.label.startsWith("beacons.") ? t(p.label as MessageKey) : p.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && byVehicle.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 dark:bg-[#111729] dark:text-slate-400">
          {t("beacons.noVehicles")}
        </p>
      )}

      <div className="gap-4 xl:columns-2">
        {byVehicle.map((entry) => (
          <VehicleCard
            key={entry.vehicle.id}
            entry={entry}
            onSaved={refetch}
            onRemove={(beacon) => void handleRemove(beacon.registeredId, beacon.driverName)}
          />
        ))}
      </div>

      {silent.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
            {t("beacons.silentTitle")}
          </h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {t("beacons.silentHint")}
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {silent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <div className="w-auto shrink-0">
                  <NameCell
                    key={`${r.beaconId}:${r.driverName}:${r.phone}`}
                    row={{ beaconId: r.beaconId, registeredId: r.id, driverName: r.driverName, phone: r.phone }}
                    onSaved={refetch}
                  />
                </div>
                <span className="min-w-0 flex-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {shortLabel(r.beaconId)}
                </span>
                <button
                  onClick={() => void handleRemove(r.id, r.driverName)}
                  aria-label={t("beacons.remove")}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
