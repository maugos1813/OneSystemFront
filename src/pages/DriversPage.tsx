import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import {
  assignDriverBeacon,
  assignDriverBeaconByMac,
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

const PERIODS = [
  { label: "24 h", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
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
function proximity(rssi: number | null): { label: string; tone: string } {
  if (rssi === null) return { label: "sin dato", tone: "text-slate-400" };
  if (rssi >= -75) return { label: "cerca", tone: "text-emerald-600 dark:text-emerald-400" };
  if (rssi >= -90) return { label: "media", tone: "text-amber-600 dark:text-amber-400" };
  return { label: "lejos", tone: "text-slate-400 dark:text-slate-500" };
}

function NameCell({ row, onSaved }: { row: Row; onSaved: () => void }) {
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
      setError(err instanceof Error ? err.message : "No se pudo guardar");
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
          placeholder="Nombre del chofer"
          maxLength={100}
          className="field-input w-44 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Teléfono"
          type="tel"
          inputMode="tel"
          maxLength={30}
          aria-label="Teléfono del chofer"
          className="field-input w-36 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {changed && name.trim() && (
          <button
            onClick={save}
            disabled={saving}
            className="brand-button rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {row.registeredId ? "Guardar" : "Asignar"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Registers a beacon before any tracker has heard it, from the MAC on its label. */
function AddByMacForm({ onAdded }: { onAdded: () => void }) {
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await assignDriverBeaconByMac(mac, name);
      setMac("");
      setName("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onMouseMove={trackGlow}
      className="glow float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
    >
      <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Asignar baliza por MAC</p>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        La MAC está impresa en la etiqueta de la baliza (por ejemplo 7C:D9:F4:0B:39:E3). Sirve para balizas con su
        identidad de fábrica; si le cambiaste el namespace o el ID, espera a que un GPS la oiga y asígnala desde la
        lista.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          required
          value={mac}
          onChange={(e) => setMac(e.target.value)}
          placeholder="7C:D9:F4:0B:39:E3"
          maxLength={17}
          className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm sm:w-56 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del chofer"
          maxLength={100}
          className="field-input w-full flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          type="submit"
          disabled={saving}
          className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Asignar baliza
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </form>
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
            aria-label="Quitar baliza"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono">{shortLabel(beacon.beaconId)}</span>
        <span className="mx-1.5">·</span>
        última vez {formatRelativeTime(beacon.lastSeen, t)}
        <span className="mx-1.5">·</span>
        <span className={near.tone}>
          {beacon.avgRssi !== null ? `${beacon.avgRssi} dBm` : "—"} ({near.label})
        </span>
        <span className="mx-1.5">·</span>
        {beacon.sightings} lecturas
        {beacon.ignitionSightings > 0
          ? `, ${beacon.ignitionSightings} con el vehículo encendido`
          : ", solo con el vehículo apagado"}
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
            ? `Último reporte de balizas: ${formatRelativeTime(entry.lastReport, t)}`
            : "Sin reportes de balizas en este periodo"}
        </p>
      </div>

      {!entry.lastReport && (
        <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Este GPS no ha enviado ningún reporte de balizas. Comprueba que tenga el Bluetooth y la detección de balizas
          activados.
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
            Ningún chofer registrado estuvo en este vehículo en el periodo.
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
            {unnamed.length} {unnamed.length === 1 ? "baliza sin nombre" : "balizas sin nombre"}
            {unnamedNear > 0 && <span className="text-emerald-600 dark:text-emerald-400">· {unnamedNear} cerca</span>}
          </button>
          {openUnnamed && (
            <>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Las que llegan con señal lejana suelen ser de otros vehículos o de gente de la zona, no de tu flota.
                Ponle nombre solo a las que sean de un chofer tuyo.
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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar las balizas"))
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
    if (!confirm(`¿Quitar la baliza de ${driverName}? Dejará de identificarse a este chofer.`)) return;
    await removeDriverBeacon(registeredId);
    refetch();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("nav.drivers")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Cada chofer lleva una baliza Bluetooth (Teltonika EYE Beacon). El GPS del vehículo la oye y así sabemos quién
        estuvo en él. Con dos choferes en la cabina se muestra como probable conductor el que se oye más fuerte: es una
        identificación, no una prueba. Para decidir quién conduce solo cuentan los momentos en que el vehículo se mueve;
        en la lista de cada vehículo se ven todas las lecturas, también las del motor encendido.
      </p>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div
          onMouseMove={trackGlow}
          className="glow float-card rounded-2xl border border-white bg-white p-4 text-sm text-slate-600 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40"
        >
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">Cómo agregar la baliza de un chofer</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>El GPS del vehículo debe tener Bluetooth activado y escanear balizas (Beacon Detection: All).</li>
            <li>
              Asígnala con su MAC (a la derecha), o acércala al GPS y espera un par de minutos: aparece en ese vehículo,
              en «sin nombre».
            </li>
            <li>Escribe el nombre del chofer y pulsa Asignar.</li>
          </ol>
        </div>
        <AddByMacForm onAdded={refetch} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-slate-500 dark:text-slate-400">Periodo</span>
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
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && byVehicle.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 dark:bg-[#111729] dark:text-slate-400">
          No hay vehículos con un GPS Teltonika, que son los que pueden oír balizas.
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
            Asignadas, sin señal en este periodo
          </h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Ningún GPS las oyó: el chofer no condujo, o la baliza está lejos o dormida.
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
                  aria-label="Quitar baliza"
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
