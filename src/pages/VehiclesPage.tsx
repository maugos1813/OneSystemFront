import { AlertTriangle, ChevronRight, IdCard, Pencil, Plus, Trash2, Truck, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AreaFilterSelect } from "../components/AreaFilterSelect";
import { useAuth } from "../context/AuthContext";
import { deviceLabel } from "../lib/deviceLabel";
import { useFleet } from "../context/FleetContext";
import { createVehicle, deleteVehicle, listMaintenance, listVehicleOdometers, updateVehicle } from "../lib/api";
import { FleetGroupSelect } from "../components/FleetGroupSelect";
import { useT } from "../i18n";
import { formatKm, STATE_BADGE, STATE_LABEL } from "../lib/maintenance";
import type { MaintenancePlan, Vehicle, VehicleOdometerRow } from "../lib/types";
import { ModalPortal } from "../components/ModalPortal";
import { NewFleetDialog } from "../components/NewFleetDialog";

function DeviceSelect({
  value,
  onChange,
  devices,
}: {
  value: string;
  onChange: (v: string) => void;
  devices: { id: string; imei: string; model: string }[];
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
          {deviceLabel(d)}
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
  canAssignDevice,
  odometer,
  maintenance,
  showMaintenance,
  onChanged,
}: {
  vehicle: Vehicle;
  deviceImei: string | null;
  devices: { id: string; imei: string; model: string }[];
  groups: readonly string[];
  canManage: boolean;
  /** Only owner/admin assign the device and the flota; a client only renames their own vehicles. */
  isAdmin: boolean;
  /** The main client (or OneSystec): a fleet's own account never gives a vehicle its device. */
  canAssignDevice: boolean;
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
          ? { name, plate: plate || undefined, ...(canAssignDevice ? { deviceId: deviceId || undefined } : {}), fleetGroup: fleetGroup || null }
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
          {canAssignDevice ? <DeviceSelect value={deviceId} onChange={setDeviceId} devices={devices} /> : <span className="text-slate-600 dark:text-slate-300">{deviceImei ?? t("vehiclesPage.unassigned")}</span>}
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
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[maintenance.status.state]}`}>{t(STATE_LABEL[maintenance.status.state])}</span>
              {maintenance.status.kmRemaining !== null && (
                <p className="mt-0.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {maintenance.status.kmRemaining >= 0 ? t("tagliando.remaining", { km: formatKm(maintenance.status.kmRemaining) }) : t("tagliando.over", { km: formatKm(-maintenance.status.kmRemaining) })}
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

/** A vehicle of the list on a phone: its km and tagliando at a glance, and clear buttons to its profile and its tagliando. */
function VehicleCard({
  vehicle,
  odometer,
  maintenance,
  showMaintenance,
}: {
  vehicle: Vehicle;
  odometer: VehicleOdometerRow | undefined;
  maintenance: MaintenancePlan | null;
  showMaintenance: boolean;
}) {
  const t = useT();
  const state = maintenance && maintenance.status.state !== "unknown" ? maintenance.status : null;
  const BUTTON =
    "flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5";
  return (
    <li className="float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{vehicle.name}</p>
          {vehicle.plate && vehicle.plate !== vehicle.name && <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.plate}</p>}
        </div>
        {vehicle.fleetGroup && (
          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            {vehicle.fleetGroup}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400 dark:text-slate-500">{t("vehiclesPage.km")}</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-200">
            {odometer?.km != null ? formatKm(odometer.km) : "—"}
            {odometer?.needsCheck && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" title={t("vehiclesPage.recheck")} />}
          </dd>
          {odometer?.needsCheck && <dd className="text-xs text-amber-700 dark:text-amber-300">{t("vehiclesPage.recheck")}</dd>}
        </div>
        {showMaintenance && (
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">{t("vehiclesPage.maintenance")}</dt>
            <dd>
              {state ? (
                <>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[state.state]}`}>{t(STATE_LABEL[state.state])}</span>
                  {state.kmRemaining !== null && (
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {state.kmRemaining >= 0 ? t("tagliando.remaining", { km: formatKm(state.kmRemaining) }) : t("tagliando.over", { km: formatKm(-state.kmRemaining) })}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">—</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex gap-2">
        <Link to={`/vehiculos/${vehicle.id}`} className={BUTTON}>
          {t("vehicleProfile.tabProfile")}
        </Link>
        {showMaintenance && (
          <Link to={`/vehiculos/${vehicle.id}?tab=mantenimiento`} className={`${BUTTON} !border-blue-200 !text-blue-700 dark:!border-blue-500/30 dark:!text-blue-300`}>
            {t("vehicleProfile.tabMaintenance")}
          </Link>
        )}
      </div>
    </li>
  );
}

/** What the "+" offers: a vehicle, or (for the main client) a whole new fleet. */
function AddChoiceDialog({ onVehicle, onFleet, onClose }: { onVehicle: () => void; onFleet: () => void; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const options = [
    { key: "vehicle", icon: Truck, title: t("vehiclesPage.newVehicle"), description: t("vehiclesPage.addVehicleDesc"), onClick: onVehicle },
    { key: "fleet", icon: UsersRound, title: t("vehiclesPage.newFleet"), description: t("vehiclesPage.newFleetDesc"), onClick: onFleet },
  ];
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 text-left whitespace-normal sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t("vehiclesPage.add")}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-md rounded-t-2xl border border-white bg-white p-5 shadow-xl sm:rounded-2xl dark:border-white/10 dark:bg-[#111729]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("vehiclesPage.add")}</h2>
            <button type="button" onClick={onClose} aria-label={t("common.cancel")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {options.map(({ key, icon: Icon, title, description, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/50 active:scale-[0.99] dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-900 dark:text-white">{title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/** The form of a new vehicle, in a dialog that a "+" opens (so the list is not pushed down by a form that is rarely used). */
function NewVehicleDialog({
  name,
  plate,
  deviceId,
  canAssignDevice,
  devices,
  submitting,
  error,
  onName,
  onPlate,
  onDevice,
  onSubmit,
  onClose,
}: {
  name: string;
  plate: string;
  deviceId: string;
  canAssignDevice: boolean;
  devices: { id: string; imei: string; model: string }[];
  submitting: boolean;
  error: string | null;
  onName: (v: string) => void;
  onPlate: (v: string) => void;
  onDevice: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
  const input = "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left whitespace-normal"
        role="dialog"
        aria-modal="true"
        aria-label={t("vehiclesPage.newVehicle")}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("vehiclesPage.newVehicle")}</h2>
            <button type="button" onClick={onClose} aria-label={t("common.cancel")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className={label}>{t("common.name")}</label>
              <input required autoFocus value={name} onChange={(e) => onName(e.target.value)} placeholder={t("vehiclesPage.namePlaceholder")} className={input} />
            </div>
            <div>
              <label className={label}>{t("common.plate")}</label>
              <input value={plate} onChange={(e) => onPlate(e.target.value)} className={input} />
            </div>
            {canAssignDevice && (
              <div>
                <label className={label}>{t("common.device")}</label>
                <DeviceSelect value={deviceId} onChange={onDevice} devices={devices} />
              </div>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={submitting} className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {t("common.create")}
            </button>
          </div>
        </form>
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
  const [dialog, setDialog] = useState<"choose" | "vehicle" | "fleet" | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [odometers, setOdometers] = useState<Map<string, VehicleOdometerRow>>(new Map());
  const [maintenance, setMaintenance] = useState<Map<string, MaintenancePlan>>(new Map());

  const isOrgAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";
  // Devices and the fleet of each vehicle are the main client's to assign: an account limited to one fleet cannot move them (the server refuses it).
  const isAdmin = isOrgAdmin && !currentUser?.allowedArea;
  // A new fleet is created by the main client (never by a fleet's own account, nor while looking at a client's account read-only).
  const canCreateFleet = isAdmin && !currentUser?.viewingAs;
  // The main client puts the devices OneSystec handed to it on its vehicles; a fleet's own account cannot (the server refuses it).
  const canAssignDevice = isAdmin && !currentUser?.viewingAs;
  // A client with the Vehículos section and a flota registers and edits the vehicles of that flota (the admin assigns devices).
  const canManage = isOrgAdmin || (!!currentUser?.allowedArea && !!currentUser.modules.includes("vehiculos"));
  // Maintenance is shown for those who have it; its state comes from the plans of each vehicle.
  const showMaintenance = isOrgAdmin || !!currentUser?.modules.includes("mantenimiento");
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
    setCreateError(null);
    try {
      await createVehicle({ name, plate: plate || undefined, ...(canAssignDevice && deviceId ? { deviceId } : {}) });
      setName("");
      setPlate("");
      setDeviceId("");
      setDialog(null);
      refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("vehiclesPage.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("vehicles.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("vehiclesPage.subtitle")}{!isAdmin && canManage && t("vehiclesPage.adminAssigns")}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              // Only the main client has a choice (vehicle or fleet); anyone else goes straight to the vehicle.
              setDialog(canCreateFleet ? "choose" : "vehicle");
            }}
            aria-label={canCreateFleet ? t("vehiclesPage.add") : t("vehiclesPage.newVehicle")}
            title={canCreateFleet ? t("vehiclesPage.add") : t("vehiclesPage.newVehicle")}
            className="brand-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {dialog === "choose" && <AddChoiceDialog onVehicle={() => setDialog("vehicle")} onFleet={() => setDialog("fleet")} onClose={() => setDialog(null)} />}
      {dialog === "fleet" && (
        <NewFleetDialog
          vehicles={vehicles}
          onClose={() => setDialog(null)}
          onCreated={(fleet, vehiclesFailed) => {
            setDialog(null);
            setNotice({ ok: !vehiclesFailed, text: t(vehiclesFailed ? "fleetNew.vehiclesFailed" : "fleetNew.created", { fleet }) });
            refetch();
          }}
        />
      )}
      {dialog === "vehicle" && (
        <NewVehicleDialog
          name={name}
          plate={plate}
          deviceId={deviceId}
          canAssignDevice={canAssignDevice}
          devices={unassignedDevices}
          submitting={submitting}
          error={createError}
          onName={setName}
          onPlate={setPlate}
          onDevice={setDeviceId}
          onSubmit={handleCreate}
          onClose={() => setDialog(null)}
        />
      )}

      {notice && (
        <p
          role="status"
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"}`}
        >
          {notice.text}
        </p>
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

      {/* On a phone the table does not fit: each vehicle is a card with its km, its tagliando and the two places to go. */}
      {!loading && shownVehicles.length > 0 && (
        <ul className="space-y-3 lg:hidden">
          {shownVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              odometer={odometers.get(vehicle.id)}
              maintenance={maintenance.get(vehicle.id) ?? null}
              showMaintenance={showMaintenance}
            />
          ))}
        </ul>
      )}

      {!loading && shownVehicles.length > 0 && (
        <div className="float-card hidden overflow-x-auto lg:block rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
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
                  deviceImei={vehicle.deviceId && deviceById.get(vehicle.deviceId) ? deviceLabel(deviceById.get(vehicle.deviceId)!) : null}
                  devices={vehicle.deviceId ? [...unassignedDevices, deviceById.get(vehicle.deviceId)!] : unassignedDevices}
                  groups={fleetGroups}
                  canManage={canManage}
                  isAdmin={isAdmin}
                  canAssignDevice={canAssignDevice}
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
