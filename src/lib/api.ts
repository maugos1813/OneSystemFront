import { clearToken, getToken } from "./auth";
import type {
  AlertPreferences,
  ApiKey,
  CreatedApiKey,
  CurrentUser,
  Device,
  DrivingStyleResponse,
  DeviceEvent,
  Geofence,
  OrgSettings,
  Position,
  Product,
  TeamMember,
  TollMonthSummary,
  TollPassage,
  Vehicle,
  WorkingHours,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL;

/** wss://.../realtime/positions?token=... — the JWT travels as a query param because a
 * browser WebSocket can't set an Authorization header on the handshake. */
export function realtimePositionsUrl(token: string): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime/positions";
  url.searchParams.set("token", token);
  return url.toString();
}

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
  fleetGroup?: string | null;
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

// --- API keys ---

export function listApiKeys(): Promise<ApiKey[]> {
  return request("/api-keys");
}

/** `allowedArea` limits the key to one área; omit it for a key with access to the whole fleet. */
export function createApiKey(name: string, allowedArea?: string | null): Promise<CreatedApiKey> {
  return request("/api-keys", { method: "POST", body: JSON.stringify({ name, allowedArea: allowedArea ?? null }) });
}

export function revokeApiKey(id: string): Promise<void> {
  return request(`/api-keys/${id}`, { method: "DELETE" });
}

// --- Settings ---

export function getSettings(): Promise<OrgSettings> {
  return request("/settings");
}

export interface UpdateSettingsInput {
  orgName?: string;
  workingHours?: Partial<WorkingHours>;
  alerts?: Partial<AlertPreferences>;
}

export function updateSettings(input: UpdateSettingsInput): Promise<OrgSettings> {
  return request("/settings", { method: "PATCH", body: JSON.stringify(input) });
}

// --- Geofences ---

export function listGeofences(): Promise<Geofence[]> {
  return request("/geofences");
}

export interface CreateCircleGeofenceInput {
  type: "circle";
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
}

export interface UpdateGeofenceInput {
  name?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
}

/** Only circles are created through the app — a polygon (e.g. an official zone boundary)
 * needs real coordinate data and is seeded directly, not hand-drawn. */
export function createGeofence(input: CreateCircleGeofenceInput): Promise<Geofence> {
  return request("/geofences", { method: "POST", body: JSON.stringify(input) });
}

export function updateGeofence(id: string, input: UpdateGeofenceInput): Promise<Geofence> {
  return request(`/geofences/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteGeofence(id: string): Promise<void> {
  return request(`/geofences/${id}`, { method: "DELETE" });
}

// --- Tolls ---

export interface TollFilters {
  vehicleId?: string;
  fleetGroup?: string;
  flaggedOnly?: boolean;
}

function tollParams(filters: TollFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.vehicleId) params.set("vehicleId", filters.vehicleId);
  if (filters.fleetGroup) params.set("fleetGroup", filters.fleetGroup);
  if (filters.flaggedOnly) params.set("flaggedOnly", "true");
  return params;
}

/** Per-month totals only — the passages themselves are fetched per month, on demand. */
export function listTollMonths(filters: TollFilters = {}): Promise<TollMonthSummary[]> {
  return request(`/tolls/months?${tollParams(filters)}`);
}

export interface TollPassagesQuery extends TollFilters {
  /** "YYYY-MM" */
  month: string;
  limit?: number;
  offset?: number;
}

export function listTollPassages(query: TollPassagesQuery): Promise<TollPassage[]> {
  const params = tollParams(query);
  params.set("month", query.month);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  return request(`/tolls/passages?${params}`);
}

export function flagTollPassage(id: string, flagged: boolean): Promise<{ id: string; flagged: boolean }> {
  return request(`/tolls/passages/${id}`, { method: "PATCH", body: JSON.stringify({ flagged }) });
}

// --- Driving style (calculated on the server) ---

export interface DrivingStyleQuery {
  days?: number;
  /** Start of the window; overrides `days` (e.g. since midnight). */
  from?: Date;
  speedLimit?: number;
}

function drivingStyleParams(query: DrivingStyleQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.days) params.set("days", String(query.days));
  if (query.from) params.set("from", query.from.toISOString());
  if (query.speedLimit) params.set("speedLimit", String(query.speedLimit));
  return params;
}

export function getDrivingStyle(query: DrivingStyleQuery = {}): Promise<DrivingStyleResponse> {
  return request(`/driving-style?${drivingStyleParams(query)}`);
}

export interface DrivingIncidentDto {
  type: "harshBraking" | "harshAcceleration" | "harshCornering" | "speeding";
  ts: string;
  lat: number;
  lng: number;
  detail: string;
}

export function getVehicleIncidents(vehicleId: string, query: DrivingStyleQuery = {}): Promise<{ incidents: DrivingIncidentDto[] }> {
  return request(`/vehicles/${vehicleId}/driving-style/incidents?${drivingStyleParams(query)}`);
}

// --- Products ---

export function listProducts(): Promise<Product[]> {
  return request("/products");
}

export function getProductSsoUrl(key: string): Promise<{ url: string }> {
  return request(`/products/${key}/sso-url`);
}

// --- Team ---

export function listTeamMembers(): Promise<TeamMember[]> {
  return request("/users");
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "viewer";
  allowedArea?: string | null;
  productKeys?: string[];
}

export function createTeamMember(input: CreateTeamMemberInput): Promise<TeamMember> {
  return request("/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateTeamMemberRole(id: string, role: "admin" | "manager" | "viewer"): Promise<TeamMember> {
  return request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export function updateTeamMemberProducts(id: string, productKeys: string[]): Promise<void> {
  return request(`/users/${id}/products`, { method: "PATCH", body: JSON.stringify({ productKeys }) });
}

export function updateTeamMemberArea(id: string, allowedArea: string | null): Promise<{ allowedArea: string | null }> {
  return request(`/users/${id}/area`, { method: "PATCH", body: JSON.stringify({ allowedArea }) });
}

export function updateTeamMemberName(id: string, name: string): Promise<TeamMember> {
  return request(`/users/${id}/name`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function updateTeamMemberEmail(id: string, email: string): Promise<TeamMember> {
  return request(`/users/${id}/email`, { method: "PATCH", body: JSON.stringify({ email }) });
}

export function updateTeamMemberPassword(id: string, password: string): Promise<void> {
  return request(`/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) });
}

export function deleteTeamMember(id: string): Promise<void> {
  return request(`/users/${id}`, { method: "DELETE" });
}
