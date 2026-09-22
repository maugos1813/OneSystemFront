import { clearToken, getToken } from "./auth";
import type { CurrentUser, Device, DeviceEvent, Position, Vehicle } from "./types";

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, "Sesión expirada");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error?.toString() ?? `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Auth ---

export function login(email: string, password: string): Promise<{ token: string }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export interface RegisterInput {
  orgName: string;
  email: string;
  password: string;
}

export function register(input: RegisterInput): Promise<{ token: string }> {
  return request("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return request("/me");
}

// --- Devices ---

export function listDevices(): Promise<Device[]> {
  return request("/devices");
}

export function claimDevice(imei: string): Promise<Device> {
  return request("/devices/claim", { method: "POST", body: JSON.stringify({ imei }) });
}

// --- Vehicles ---

export function listVehicles(): Promise<Vehicle[]> {
  return request("/vehicles");
}

export interface VehicleInput {
  name: string;
  plate?: string;
  deviceId?: string;
}

export function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return request("/vehicles", { method: "POST", body: JSON.stringify(input) });
}

export function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  return request(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteVehicle(id: string): Promise<void> {
  return request(`/vehicles/${id}`, { method: "DELETE" });
}

// --- Positions & events ---

export function getLatestPosition(vehicleId: string): Promise<Position | null> {
  return request<Position>(`/vehicles/${vehicleId}/positions/latest`).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}

export interface DateRangeQuery {
  from?: Date;
  to?: Date;
  limit?: number;
}

function dateRangeQueryString({ from, to, limit }: DateRangeQuery): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getPositionHistory(vehicleId: string, range: DateRangeQuery = {}): Promise<Position[]> {
  return request(`/vehicles/${vehicleId}/positions${dateRangeQueryString(range)}`);
}

export function getDeviceEvents(vehicleId: string, range: DateRangeQuery = {}): Promise<DeviceEvent[]> {
  return request(`/vehicles/${vehicleId}/events${dateRangeQueryString(range)}`);
}
