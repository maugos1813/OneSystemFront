import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useFleet } from "../context/FleetContext";
import { createVehicle, deleteVehicle, updateVehicle } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { Vehicle } from "../lib/types";

function DeviceSelect({
  value,
  onChange,
  devices,
}: {
  value: string;
  onChange: (v: string) => void;
  devices: { id: string; imei: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
    >
      <option value="">Sin dispositivo</option>
      {devices.map((d) => (
        <option key={d.id} value={d.id}>
          {d.imei}
        </option>
      ))}
    </select>
  );
}

function VehicleRow({
  vehicle,
  deviceImei,
  devices,
  onChanged,
}: {
  vehicle: Vehicle;
  deviceImei: string | null;
  devices: { id: string; imei: string }[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(vehicle.name);
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [deviceId, setDeviceId] = useState(vehicle.deviceId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateVehicle(vehicle.id, { name, plate: plate || undefined, deviceId: deviceId || undefined });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar el vehículo "${vehicle.name}"?`)) return;
    await deleteVehicle(vehicle.id);
    onChanged();
  }

  if (editing) {
    return (
      <tr>
        <td className="px-4 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="field-input w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <DeviceSelect value={deviceId} onChange={setDeviceId} devices={devices} />
        </td>
        <td className="px-4 py-2 text-right">
          <button
            onClick={save}
            disabled={saving}
            className="brand-button mr-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-slate-900">{vehicle.name}</td>
      <td className="px-4 py-3 text-slate-600">{vehicle.plate ?? "—"}</td>
      <td className="px-4 py-3 text-slate-600">{deviceImei ?? "Sin asignar"}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => setEditing(true)}
          className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={remove}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export function VehiclesPage() {
  const { vehicles, devices, loading, refetch } = useFleet();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const unassignedDevices = devices.filter((d) => !vehicles.some((v) => v.deviceId === d.id));

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createVehicle({ name, plate: plate || undefined, deviceId: deviceId || undefined });
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
      <h1 className="text-xl font-semibold text-slate-900">Vehículos</h1>
      <p className="mb-6 text-sm text-slate-500">Tu flota y los dispositivos asignados a cada uno.</p>

      <form
        onSubmit={handleCreate}
        onMouseMove={trackGlow}
        className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Camión 1"
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="mb-1 block text-sm font-medium text-slate-700">Patente</label>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-sm font-medium text-slate-700">Dispositivo</label>
          <DeviceSelect value={deviceId} onChange={setDeviceId} devices={unassignedDevices} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Crear
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      {!loading && vehicles.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no creaste ningún vehículo.</p>
      )}

      {!loading && vehicles.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Patente</th>
                <th className="px-4 py-2 font-medium">Dispositivo</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  deviceImei={vehicle.deviceId ? (deviceById.get(vehicle.deviceId)?.imei ?? null) : null}
                  devices={vehicle.deviceId ? [...unassignedDevices, deviceById.get(vehicle.deviceId)!] : unassignedDevices}
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
