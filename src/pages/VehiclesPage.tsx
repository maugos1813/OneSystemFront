import { AlertTriangle, IdCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AreaFilterSelect } from "../components/AreaFilterSelect";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { createVehicle, deleteVehicle, listMaintenance, listVehicleOdometers, updateVehicle } from "../lib/api";
import { FleetGroupSelect } from "../components/FleetGroupSelect";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";
import { formatKm, STATE_BADGE, STATE_LABEL } from "../lib/maintenance";
import type { MaintenancePlan, Vehicle, VehicleOdometerRow } from "../lib/types";
import { ModalPortal } from "../components/ModalPortal";

function DeviceSelect({
  value,
  onChange,
  devices,
}: {
  value: string;
  onChange: (v: string) => void;
  devices: { id: string; imei: string }[];
}) {
  const t = useT();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      <option value="">{t("vehiclesPage.noDevice")}</option>
      {devices.map((d) => (
        <option key={d.id} value={d.id}>
          {d.imei}
        </option>
      ))}
    </select>
  );
}

function AreaSelect({ value, onChange, groups }: { value: string; onChange: (v: string) => void; groups: readonly string[] }) {
  const t = useT();
  return (
    <FleetGroupSelect
      value={value}
      onChange={onChange}
      groups={groups}
      emptyLabel={t("fleet.none")}
      className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
    />
  );
}

function VehicleRow({
  vehicle,
  deviceImei,
  devices,
  groups,
  canManage,
  isAdmin,
  odometer,
  maintenance,
  showMaintenance,
  onChanged,
}: {
  vehicle: Vehicle;
  deviceImei: string | null;
  devices: { id: string; imei: string }[];
  groups: readonly string[];
  canManage: boolean;
  /** Only owner/admin assign the device and the flota; a client only renames their own vehicles. */
  isAdmin: boolean;
  odometer: VehicleOdometerRow | undefined;
  /** Its tagliando plan, or null when none has been entered. */
  maintenance: MaintenancePlan | null;
  showMaintenance: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(vehicle.name);
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [deviceId, setDeviceId] = useState(vehicle.deviceId ?? "");
  const [fleetGroup, setFleetGroup] = useState(vehicle.fleetGroup ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateVehicle(
        vehicle.id,
        isAdmin
          ? { name, plate: plate || undefined, deviceId: deviceId || undefined, fleetGroup: fleetGroup || null }
          : { name, plate: plate || undefined },
      );
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Reaching this button already means the person read the warning about the device.
      await deleteVehicle(vehicle.id, { confirmDevice: true });
      setConfirmingDelete(false);
      onChanged();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("vehiclesPage.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td className="px-4 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="field-input w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </td>
        <td className="px-4 py-2" />
        {showMaintenance && <td className="px-4 py-2" />}
        <td className="px-4 py-2">
          {isAdmin ? <DeviceSelect value={deviceId} onChange={setDeviceId} devices={devices} /> : <span className="text-slate-600 dark:text-slate-300">{deviceImei ?? t("vehiclesPage.unassigned")}</span>}
        </td>
        <td className="px-4 py-2">
          {isAdmin ? <AreaSelect value={fleetGroup} onChange={setFleetGroup} groups={groups} /> : <span className="text-slate-600 dark:text-slate-300">{vehicle.fleetGroup ?? "—"}</span>}
        </td>
        <td className="px-4 py-2 text-right">
          <button
            onClick={save}
            disabled={saving}
            className="brand-button mr-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {t("common.save")}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
        <Link to={`/vehiculos/${vehicle.id}`} className="hover:text-blue-600 hover:underline dark:hover:text-blue-400">
          {vehicle.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{vehicle.plate ?? "—"}</td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
        {odometer?.km != null ? formatKm(odometer.km) : <span className="text-slate-400 dark:text-slate-500">—</span>}
        {odometer?.needsCheck && (
          <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" title={t("vehiclesPage.recheck")} aria-label={t("vehiclesPage.recheck")} />
        )}
      </td>
      {showMaintenance && (
        <td className="px-4 py-3">
          {maintenance && maintenance.status.state !== "unknown" ? (
            <div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[maintenance.status.state]}`}>{STATE_LABEL[maintenance.status.state]}</span>
              {maintenance.status.kmRemaining !== null && (
                <p className="mt-0.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {maintenance.status.kmRemaining >= 0 ? `Faltan ${formatKm(maintenance.status.kmRemaining)}` : `Pasado ${formatKm(-maintenance.status.kmRemaining)}`}
                </p>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{deviceImei ?? t("vehiclesPage.unassigned")}</td>
      <td className="px-4 py-3">
        {vehicle.fleetGroup ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            {vehicle.fleetGroup}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          to={`/vehiculos/${vehicle.id}`}
          className="mr-1 inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
          aria-label={t("vehicleProfile.open")}
          title={t("vehicleProfile.open")}
        >
          <IdCard className="h-4 w-4" />
        </Link>
        {canManage && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        {confirmingDelete && (
          <DeleteVehicleDialog
            vehicle={vehicle}
            deviceImei={deviceImei}
            deleting={deleting}
            error={deleteError}
            onCancel={() => {
              setConfirmingDelete(false);
              setDeleteError(null);
            }}
            onConfirm={() => void remove()}
          />
        )}
      </td>
    </tr>
  );
}

/** Asks before deleting a vehicle, and says plainly what happens to its device, documents and maintenance. */
function DeleteVehicleDialog({
  vehicle,
  deviceImei,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  vehicle: Vehicle;
  deviceImei: string | null;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const hasDevice = !!vehicle.deviceId;
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left whitespace-normal" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("deleteVehicle.title", { name: `${vehicle.name}${vehicle.plate ? ` (${vehicle.plate})` : ""}` })}
        </h2>

        {hasDevice && (
          <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>{t("deleteVehicle.deviceWarning", { imei: deviceImei ? ` (${deviceImei})` : "" })}</strong>
              {t("deleteVehicle.deviceWarningBody")}
            </p>
          </div>
        )}

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {t("deleteVehicle.consequences")}
        </p>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {hasDevice ? t("deleteVehicle.anyway") : t("common.delete")}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

export function VehiclesPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const { vehicles, filteredVehicles, devices, loading, refetch, fleetGroups } = useFleet();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [odometers, setOdometers] = useState<Map<string, VehicleOdometerRow>>(new Map());
  const [maintenance, setMaintenance] = useState<Map<string, MaintenancePlan>>(new Map());

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";
  // A client with the Vehículos section and a flota registers and edits the vehicles of that flota (the admin assigns devices).
  const canManage = isAdmin || (!!currentUser?.allowedArea && !!currentUser.modules.includes("vehiculos"));
  // Maintenance is shown for those who have it; its state comes from the plans of each vehicle.
  const showMaintenance = isAdmin || !!currentUser?.modules.includes("mantenimiento");
  const vehicleCount = vehicles.length;
  useEffect(() => {
    let cancelled = false;
    listVehicleOdometers()
      .then((rows) => !cancelled && setOdometers(new Map(rows.map((r) => [r.vehicleId, r]))))
      .catch(() => undefined); // the km are a convenience here: the list works without them
    if (showMaintenance) {
      listMaintenance()
        .then((rows) => !cancelled && setMaintenance(
              new Map(
                rows.flatMap((r) => {
                  const plan = r.plans.find((p) => p.name.trim().toLowerCase() === "tagliando");
                  return plan ? [[r.vehicleId, plan] as const] : [];
                }),
              ),
            ))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [showMaintenance, vehicleCount]);
  // Spaces and case do not matter: "er643 vy" finds ER643VY.
  const shownVehicles = useMemo(() => {
    const q = search.toLowerCase().replace(/\s/g, "");
    if (!q) return filteredVehicles;
    return filteredVehicles.filter((v) => `${v.name}${v.plate ?? ""}`.toLowerCase().replace(/\s/g, "").includes(q));
  }, [filteredVehicles, search]);
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const unassignedDevices = devices.filter((d) => !vehicles.some((v) => v.deviceId === d.id));

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createVehicle({ name, plate: plate || undefined, ...(isAdmin && deviceId ? { deviceId } : {}) });
      setName("");
      setPlate("");
      setDeviceId("");
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("vehicles.title")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("vehiclesPage.subtitle")}{!isAdmin && canManage && t("vehiclesPage.adminAssigns")}
      </p>

      {canManage && (
        <form
          onSubmit={handleCreate}
          onMouseMove={trackGlow}
          className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.name")}</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vehiclesPage.namePlaceholder")}
              className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.plate")}</label>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          {isAdmin && (
            <div className="w-full sm:w-48">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.device")}</label>
              <DeviceSelect value={deviceId} onChange={setDeviceId} devices={unassignedDevices} />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("common.create")}
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("vehiclesPage.search")}
          aria-label={t("vehiclesPage.search")}
          className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-72 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.fleet")}</span>
          <AreaFilterSelect />
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}

      {!loading && vehicles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("vehiclesPage.noneCreated")}</p>
      )}

      {!loading && vehicles.length > 0 && filteredVehicles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("vehiclesPage.noMatchFleet")}</p>
      )}

      {!loading && filteredVehicles.length > 0 && shownVehicles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">«{search}»: {t("vehiclesPage.noMatchFleet").toLowerCase()}</p>
      )}

      {!loading && shownVehicles.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t("common.name")}</th>
                <th className="px-4 py-2 font-medium">{t("common.plate")}</th>
                <th className="px-4 py-2 font-medium">{t("vehiclesPage.km")}</th>
                {showMaintenance && <th className="px-4 py-2 font-medium">{t("vehiclesPage.maintenance")}</th>}
                <th className="px-4 py-2 font-medium">{t("common.device")}</th>
                <th className="px-4 py-2 font-medium">{t("common.fleet")}</th>
                <th className="px-4 py-2 font-medium text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {shownVehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  odometer={odometers.get(vehicle.id)}
                  maintenance={maintenance.get(vehicle.id) ?? null}
                  showMaintenance={showMaintenance}
                  deviceImei={vehicle.deviceId ? (deviceById.get(vehicle.deviceId)?.imei ?? null) : null}
                  devices={vehicle.deviceId ? [...unassignedDevices, deviceById.get(vehicle.deviceId)!] : unassignedDevices}
                  groups={fleetGroups}
                  canManage={canManage}
                  isAdmin={isAdmin}
                  onChanged={refetch}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
