import { rememberedLanguage, translate, type MessageKey } from "../i18n";
import { isNativeApp } from "./appFlavor";
import { getRefreshToken, getToken } from "./auth";
import { endSession, getFreshToken, renewSession } from "./session";
import { MODULE_KEYS, MODULE_TEMPLATES, type ModuleKey } from "./modules";
import type {
  AlertPreferences,
  ApiKey,
  CreatedApiKey,
  CurrentUser,
  Device,
  DeviceCommand,
  SharedVehicle,
  DeviceDetail,
  MaintenancePlan,
  MaintenanceRecord,
  VehicleDocument,
  FuelType,
  Tagliando,
  VehicleMaintenance,
  VehicleOdometer,
  VehicleOdometerRow,
  VehicleProfile,
  VehicleWithDocuments,
  DrivingStyleResponse,
  DeviceEvent,
  Geofence,
  OrgSettings,
  Position,
  SimCard,
  DetectedBeacon,
  DriverBeacon,
  VehicleBeacons,
  VehicleDriver,
  VehicleEta,
  SimSecrets,
  Product,
  TeamMember,
  Vehicle,
  WorkingHours,
  PlatformOrganization,
  PlatformOrganizationDetail,
  FleetTag,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL;

/** wss://.../realtime/positions?token=... — the JWT travels as a query param because a
 * browser WebSocket can't set an Authorization header on the handshake. */
export function realtimePositionsUrl(token: string, allClients = false): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime/positions";
  url.searchParams.set("token", token);
  // OneSystec's own map: every device of every client (the server only allows it to OneSystec).
  if (allClients) url.searchParams.set("scope", "all");
  return url.toString();
}

/** The server words some messages in English or Spanish: the ones a person can run into are shown in their own language. */
const SERVER_MESSAGES: Record<string, MessageKey> = {
  "Esta sección no está habilitada para tu cuenta": "api.sectionDisabled",
  Forbidden: "api.forbidden",
  "Vehicle not found": "api.vehicleNotFound",
  "Email already registered": "api.emailTaken",
  "Invalid credentials": "api.invalidCredentials",
  "Invalid code": "api.invalidCode",
  "Invalid password or code": "api.invalidPasswordOrCode",
  "Sign-in expired, start again": "api.signInExpired",
  "Authenticator already set up": "api.totpAlreadySet",
  "El autenticador es obligatorio para tu rol": "api.totpRequiredForRole",
  "Too many attempts. Try again later.": "api.tooManyAttempts",
  "Este vehículo tiene un dispositivo asignado. Confirma que quieres eliminarlo.": "api.deviceAssigned",
};

function localizeServerMessage(message: string): string {
  const key = SERVER_MESSAGES[message];
  return key ? translate(rememberedLanguage(), key) : message;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // Fastify refuses a JSON content type with an empty body (DELETE, and POSTs without a payload).
      ...(init.body != null ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

async function readAnswer<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ? localizeServerMessage(body.error.toString()) : translate(rememberedLanguage(), "api.error", { status: res.status }));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * A call as the signed-in user. The login token is short, so it is renewed (with the refresh token) before it runs out, and a
 * 401 gets one renewal and a second try; only if the server refuses to renew is the session over.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = await getFreshToken();
  let res = await send(path, init, token);

  if (res.status === 401 && token) {
    const outcome = await renewSession();
    if (outcome === "ok") {
      token = getToken();
      res = await send(path, init, token);
    } else if (outcome === "unreachable") {
      throw new ApiError(0, translate(rememberedLanguage(), "api.unreachable"));
    }
  }

  if (res.status === 401) {
    endSession();
    throw new ApiError(401, translate(rememberedLanguage(), "api.sessionExpired"));
  }
  return readAnswer<T>(res);
}

/** A call with no session behind it (signing in): a 401 here is a wrong password or code, not an ended session. */
async function publicRequest<T>(path: string, body: unknown): Promise<T> {
  return readAnswer<T>(await send(path, { method: "POST", body: JSON.stringify(body) }, null));
}

// --- Auth ---

/** What the sign-in answers: a session, or the next step (the code from the authenticator app, or setting that app up first). */
export type LoginAnswer =
  | { mfaRequired?: undefined; mfaSetupRequired?: undefined; token: string; refreshToken?: string }
  | { mfaRequired: true; mfaSetupRequired?: undefined; mfaToken: string }
  | { mfaSetupRequired: true; mfaRequired?: undefined; mfaToken: string };

export interface SessionTokens {
  token: string;
  refreshToken?: string;
}

/** The Android apps keep a session for a month, a browser for a working day: the server needs to know which this is. */
const CLIENT_KIND = isNativeApp() ? "app" : "web";

export function login(email: string, password: string): Promise<LoginAnswer> {
  return publicRequest("/auth/login", { email, password, client: CLIENT_KIND });
}

export function loginSecondStep(mfaToken: string, input: { code: string } | { recoveryCode: string }): Promise<SessionTokens & { usedRecoveryCode: boolean; recoveryCodesLeft: number }> {
  return publicRequest("/auth/login/totp", { mfaToken, ...input });
}

export interface TotpSetup {
  /** The key as text, for typing it into the authenticator app when the QR can't be scanned. */
  secret: string;
  /** The otpauth:// address the QR code carries. */
  uri: string;
}

export function startLoginTotpSetup(mfaToken: string): Promise<TotpSetup> {
  return publicRequest("/auth/login/totp/setup", { mfaToken });
}

export function enableLoginTotp(mfaToken: string, code: string): Promise<SessionTokens & { recoveryCodes: string[] }> {
  return publicRequest("/auth/login/totp/enable", { mfaToken, code });
}

/** Ends this session on the server (best effort: the device forgets it either way). */
export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken();
  const token = getToken();
  try {
    await send("/auth/logout", { method: "POST", body: JSON.stringify(refreshToken ? { refreshToken } : {}) }, token);
  } catch {
    // Offline: the session simply runs out on its own.
  }
}

export interface SecurityStatus {
  enabled: boolean;
  required: boolean;
  recoveryCodesLeft: number;
}

export interface SessionInfo {
  id: string;
  device: string;
  client: "web" | "app";
  ip: string | null;
  mfa: boolean;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export const getSecurity = (): Promise<SecurityStatus> => request("/auth/security");
export const startTotpSetup = (): Promise<TotpSetup> => request("/auth/totp/setup", { method: "POST" });
export const enableTotp = (code: string): Promise<{ recoveryCodes: string[] }> => request("/auth/totp/enable", { method: "POST", body: JSON.stringify({ code }) });
export const disableTotp = (password: string, input: { code: string } | { recoveryCode: string }): Promise<void> =>
  request("/auth/totp/disable", { method: "POST", body: JSON.stringify({ password, ...input }) });
export const regenerateRecoveryCodes = (password: string, code: string): Promise<{ recoveryCodes: string[] }> =>
  request("/auth/totp/recovery-codes", { method: "POST", body: JSON.stringify({ password, code }) });
export const listSessions = (): Promise<SessionInfo[]> => request("/auth/sessions");
export const revokeSession = (id: string): Promise<void> => request(`/auth/sessions/${id}`, { method: "DELETE" });
export const revokeOtherSessions = (): Promise<{ revoked: number }> => request("/auth/sessions/revoke-others", { method: "POST" });
/** A member lost their phone: their authenticator is removed (and they are signed out everywhere). */
export const resetMemberTotp = (userId: string): Promise<void> => request(`/users/${userId}/totp/reset`, { method: "POST" });
export const resetPlatformUserTotp = (userId: string): Promise<void> => request(`/platform/users/${userId}/totp/reset`, { method: "POST" });

/** What a role may use when the server doesn't say (an older server that predates the sections). */
function fallbackModules(role: CurrentUser["role"]): ModuleKey[] {
  return role === "owner" || role === "admin" ? [...MODULE_KEYS] : [...MODULE_TEMPLATES.estandar];
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const me = await request<CurrentUser>("/me");
  return { ...me, modules: me.modules ?? fallbackModules(me.role), language: me.language ?? "es" };
}

// --- Devices ---

export function listDevices(): Promise<Device[]> {
  return request("/devices");
}

/** `orgId` is for OneSystec only: the client the device goes to (without it, the caller's own organization). */
export function claimDevice(imei: string, model?: string, orgId?: string): Promise<Device> {
  return request("/devices/claim", {
    method: "POST",
    body: JSON.stringify({ imei, ...(model ? { model } : {}), ...(orgId ? { orgId } : {}) }),
  });
}

export function getDevice(id: string): Promise<DeviceDetail> {
  return request(`/devices/${id}`);
}

export interface DevicePatch {
  model?: string;
  serialNumber?: string | null;
  firmware?: string | null;
}

export function updateDevice(id: string, patch: DevicePatch): Promise<Device> {
  return request(`/devices/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function getDeviceCommands(id: string): Promise<DeviceCommand[]> {
  return request(`/devices/${id}/commands`);
}

/** Switches the tracker's own harsh-driving measurement (Green Driving) on or off. */
export function requestGreenDriving(id: string, action: "enable" | "disable"): Promise<DeviceCommand> {
  return request(`/devices/${id}/green-driving`, { method: "POST", body: JSON.stringify({ action, source: "accelerometer" }) });
}

/** Locks (`lock`) or releases (`unlock`) the vehicle through the tracker's output. */
export function requestImmobilizer(id: string, action: "lock" | "unlock"): Promise<DeviceCommand> {
  return request(`/devices/${id}/immobilizer`, { method: "POST", body: JSON.stringify({ action }) });
}

// --- SIM cards (owner/admin) ---

export interface SimInput {
  deviceId?: string | null;
  operator?: string;
  iccid?: string;
  phoneNumber?: string | null;
  nmu?: string | null;
  pin?: string | null;
  puk?: string | null;
  notes?: string | null;
}

/** SIMs are OneSystec's: `orgId` picks the client whose SIMs these are (without it, the caller's own organization). */
const simQuery = (orgId?: string) => (orgId ? `?orgId=${encodeURIComponent(orgId)}` : "");

export function listSims(orgId?: string): Promise<SimCard[]> {
  return request(`/sims${simQuery(orgId)}`);
}

export function createSim(input: SimInput & { iccid: string }, orgId?: string): Promise<SimCard> {
  return request(`/sims${simQuery(orgId)}`, { method: "POST", body: JSON.stringify(input) });
}

/** Only the fields sent change; an empty string clears an optional one. */
export function updateSim(id: string, input: SimInput, orgId?: string): Promise<SimCard> {
  return request(`/sims/${id}${simQuery(orgId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteSim(id: string, orgId?: string): Promise<void> {
  return request(`/sims/${id}${simQuery(orgId)}`, { method: "DELETE" });
}

export function getSimSecrets(id: string, orgId?: string): Promise<SimSecrets> {
  return request(`/sims/${id}/secrets${simQuery(orgId)}`);
}

// --- Vehicles ---

export function listVehicles(): Promise<Vehicle[]> {
  return request("/vehicles");
}

/** The Gamonal vehicles Gamonal Driver lets this client see on the map (empty for anyone without that access). */
export async function listDriverVehicles(): Promise<SharedVehicle[]> {
  return (await request<{ vehicles: SharedVehicle[] }>("/driver-vehicles")).vehicles;
}

export interface VehicleInput {
  name: string;
  plate?: string;
  deviceId?: string;
  fleetGroup?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  fuelType?: FuelType | null;
  color?: string | null;
  notes?: string | null;
}

export function getVehicleProfile(id: string): Promise<VehicleProfile> {
  return request(`/vehicles/${id}/profile`);
}

export function listVehicleOdometers(): Promise<VehicleOdometerRow[]> {
  return request("/vehicles/odometers");
}

/** Sets the current km and whether it is kept by itself ("auto": the GPS counts on from it) or by hand ("manual"). */
export function setVehicleOdometer(id: string, input: { mode: "auto" | "manual"; km?: number }): Promise<VehicleOdometer> {
  return request(`/vehicles/${id}/odometer`, { method: "PUT", body: JSON.stringify(input) });
}

export function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return request("/vehicles", { method: "POST", body: JSON.stringify(input) });
}

export function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  return request(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** `confirmDevice` says the person was warned that the vehicle's device will be unlinked (a client's request is refused without it). */
export function deleteVehicle(id: string, options: { confirmDevice?: boolean } = {}): Promise<void> {
  return request(`/vehicles/${id}${options.confirmDevice ? "?confirmDevice=true" : ""}`, { method: "DELETE" });
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
  /** Spread up to this many points over the whole range (the server keeps the speeding peaks) instead of only its newest rows. */
  maxPoints?: number;
}

function dateRangeQueryString({ from, to, limit, maxPoints }: DateRangeQuery): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());
  if (limit) params.set("limit", String(limit));
  if (maxPoints) params.set("maxPoints", String(maxPoints));
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
  /** A data URL sets the logo, null removes it. */
  orgLogo?: string | null;
  /** The small copy of that logo, for the map's plate tags. */
  orgLogoTag?: string | null;
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

export async function listTeamMembers(): Promise<TeamMember[]> {
  const members = await request<TeamMember[]>("/users");
  return members.map((member) => ({ ...member, modules: member.modules ?? fallbackModules(member.role) }));
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "viewer";
  allowedArea?: string | null;
  /** The member's own logo as a data URL (see logoImage.ts). */
  logo?: string | null;
  /** The small copy of it for the map's plate tags (the fleet picture, when the member is limited to a fleet). */
  logoTag?: string | null;
  /** OneTrack sections to give (see modules.ts); omitted means the standard package. */
  modules?: string[];
  /** The member's language; Spanish when omitted. */
  language?: "es" | "it";
  productKeys?: string[];
}

export function createTeamMember(input: CreateTeamMemberInput): Promise<TeamMember> {
  return request("/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateTeamMemberModules(id: string, modules: string[]): Promise<{ id: string; modules: string[] }> {
  return request(`/users/${id}/modules`, { method: "PATCH", body: JSON.stringify({ modules }) });
}

export function updateTeamMemberLanguage(id: string, language: "es" | "it"): Promise<{ id: string; language: "es" | "it" }> {
  return request(`/users/${id}/language`, { method: "PATCH", body: JSON.stringify({ language }) });
}

export function updateTeamMemberLogo(id: string, logo: string | null, tag: string | null = null): Promise<{ id: string; logo: string | null }> {
  return request(`/users/${id}/logo`, { method: "PATCH", body: JSON.stringify({ logo, tag }) });
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

// --- Maintenance ---

export interface MaintenancePlanInput {
  name?: string;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastDoneAt?: string | null;
  lastDoneKm?: number | null;
  /** What the dashboard reads now: lines the GPS count up with it. */
  dashboardKm?: number | null;
  notes?: string | null;
}

/** Every vehicle's plans, or only `vehicleId`'s. */
export function listMaintenance(vehicleId?: string): Promise<VehicleMaintenance[]> {
  return request(vehicleId ? `/maintenance?vehicleId=${vehicleId}` : "/maintenance");
}

export function getTagliando(vehicleId: string): Promise<Tagliando> {
  return request(`/maintenance/vehicles/${vehicleId}/tagliando`);
}

/** Enters a tagliando that was done (`mode: "fix"` corrects the last one instead of adding another). */
export function saveTagliando(vehicleId: string, input: { km: number; doneAt?: string; mode?: "new" | "fix" }): Promise<Tagliando> {
  return request(`/maintenance/vehicles/${vehicleId}/tagliando`, { method: "PUT", body: JSON.stringify(input) });
}

export function createMaintenancePlan(vehicleId: string, input: MaintenancePlanInput): Promise<MaintenancePlan> {
  return request("/maintenance/plans", { method: "POST", body: JSON.stringify({ vehicleId, ...input }) });
}

export function updateMaintenancePlan(id: string, input: MaintenancePlanInput): Promise<MaintenancePlan> {
  return request(`/maintenance/plans/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMaintenancePlan(id: string): Promise<void> {
  return request(`/maintenance/plans/${id}`, { method: "DELETE" });
}

export function listMaintenanceRecords(planId: string): Promise<MaintenanceRecord[]> {
  return request(`/maintenance/plans/${planId}/records`);
}

export function registerMaintenanceService(
  planId: string,
  input: { doneAt?: string; odometerKm?: number | null; dashboardKm?: number | null; notes?: string | null },
): Promise<MaintenancePlan> {
  return request(`/maintenance/plans/${planId}/records`, { method: "POST", body: JSON.stringify(input) });
}

export function calibrateOdometer(
  vehicleId: string,
  dashboardKm: number,
): Promise<{ source: "obd" | "gps"; trackerKm: number | null; offsetKm: number; odometerKm: number }> {
  return request(`/maintenance/vehicles/${vehicleId}/odometer`, { method: "PUT", body: JSON.stringify({ dashboardKm }) });
}

// --- Vehicle documents (vencimientos) ---

export interface DocumentInput {
  kind: VehicleDocument["kind"];
  label?: string | null;
  /** "YYYY-MM-DD" */
  expiresOn: string;
  remindDays?: number;
  notes?: string | null;
}

export function listVehicleDocuments(): Promise<VehicleWithDocuments[]> {
  return request("/vehicle-documents");
}

export function createVehicleDocument(vehicleId: string, input: DocumentInput): Promise<VehicleDocument> {
  return request(`/vehicles/${vehicleId}/documents`, { method: "POST", body: JSON.stringify(input) });
}

export function updateVehicleDocument(id: string, input: Partial<DocumentInput>): Promise<VehicleDocument> {
  return request(`/vehicle-documents/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteVehicleDocument(id: string): Promise<void> {
  return request(`/vehicle-documents/${id}`, { method: "DELETE" });
}

// --- Push notifications (the Android app) ---

export function registerPushToken(token: string): Promise<void> {
  return request("/push-tokens", { method: "POST", body: JSON.stringify({ token, platform: "android" }) });
}

export function unregisterPushToken(token: string): Promise<void> {
  return request("/push-tokens/unregister", { method: "POST", body: JSON.stringify({ token }) });
}

// --- Drivers (Bluetooth beacons) ---

export function listDriverBeacons(): Promise<DriverBeacon[]> {
  return request("/driver-beacons");
}

export function listDetectedBeacons(hours = 24): Promise<DetectedBeacon[]> {
  return request(`/driver-beacons/detected?hours=${hours}`);
}

/** Per vehicle with a Teltonika tracker, the beacons it heard in the last `hours` hours. */
export function listBeaconsByVehicle(hours = 24): Promise<VehicleBeacons[]> {
  return request(`/driver-beacons/by-vehicle?hours=${hours}`);
}

export function assignDriverBeacon(beaconId: string, driverName: string, phone?: string): Promise<DriverBeacon> {
  return request("/driver-beacons", { method: "POST", body: JSON.stringify({ beaconId, driverName, phone }) });
}

/** For an EYE Beacon still on its factory identity: the MAC printed on its label is enough. */
export function assignDriverBeaconByMac(mac: string, driverName: string): Promise<DriverBeacon> {
  return request("/driver-beacons", { method: "POST", body: JSON.stringify({ mac, driverName }) });
}

/** Changes the driver's name and/or phone; a phone of "" removes it. */
export function updateDriverBeacon(id: string, changes: { driverName?: string; phone?: string }): Promise<DriverBeacon> {
  return request(`/driver-beacons/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export function removeDriverBeacon(id: string): Promise<void> {
  return request(`/driver-beacons/${id}`, { method: "DELETE" });
}

/** How long the vehicle takes to reach a city or an address (by road, with a traffic allowance). */
export function getVehicleEta(vehicleId: string, to: string): Promise<VehicleEta> {
  return request(`/vehicles/${vehicleId}/eta?${new URLSearchParams({ to })}`);
}

/** Every driver Gamonal Driver gave the vehicle to between `from` and `to`. */
export function getVehicleDriver(vehicleId: string, range: { from?: Date; to?: Date } = {}): Promise<VehicleDriver> {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  return request(`/vehicles/${vehicleId}/driver?${params}`);
}

// --- Platform administration (OneSystec only) ---

export function listPlatformOrganizations(): Promise<PlatformOrganization[]> {
  return request<PlatformOrganization[]>("/platform/organizations");
}

export function getPlatformOrganization(id: string): Promise<PlatformOrganizationDetail> {
  return request<PlatformOrganizationDetail>(`/platform/organizations/${id}`);
}

export function createPlatformOrganization(input: { orgName: string; email: string; password: string }): Promise<{ orgId: string; userId: string }> {
  return request<{ orgId: string; userId: string }>("/platform/organizations", { method: "POST", body: JSON.stringify(input) });
}

/** A read-only token to look at a client's account (OneSystec only). */
export function viewClientToken(orgId: string): Promise<{ token: string; orgId: string; orgName: string }> {
  return request(`/platform/organizations/${orgId}/view`, { method: "POST" });
}

/** OneSystec's own map: every vehicle and device of every client (a device without a vehicle gets a stand-in), with positions. */
export function getPlatformFleet(): Promise<{ vehicles: Vehicle[]; devices: Device[]; positions: Record<string, Position>; logos: Record<string, string> }> {
  return request("/platform/fleet");
}

/** OneSystec only: puts or removes the photo of any client's user (null removes it). */
export function setUserLogoAsPlatform(userId: string, logo: string | null, tag: string | null = null): Promise<{ id: string; logo: string | null }> {
  return request(`/platform/users/${userId}/logo`, { method: "PATCH", body: JSON.stringify({ logo, tag }) });
}

/** OneSystec only: what a client may have (OneTrack sections and administration pages); null lifts the limit. */
export function setOrganizationSections(orgId: string, sections: string[] | null): Promise<{ sections: string[] | null }> {
  return request(`/platform/organizations/${orgId}/sections`, { method: "PATCH", body: JSON.stringify({ sections }) });
}

/** OneSystec only: puts or removes a client's company logo (null removes it). */
export function setOrganizationLogoAsPlatform(orgId: string, logo: string | null, tag: string | null = null): Promise<{ id: string; logo: string | null }> {
  return request(`/platform/organizations/${orgId}/logo`, { method: "PATCH", body: JSON.stringify({ logo, tag }) });
}

// --- Fleets (flotas) ---

/** Owner/admin: exactly which vehicles a fleet has (the ones it had that are not listed are left without a fleet). */
export function setFleetVehicles(fleet: string, vehicleIds: string[]): Promise<{ inFleet: number; released: number }> {
  return request("/fleets/vehicles", { method: "PUT", body: JSON.stringify({ fleet, vehicleIds }) });
}

/** The fleets of the caller's organization and their pictures: what the map needs for the tag of each plate. */
export function listFleetPictures(): Promise<FleetTag[]> {
  return request("/fleets");
}

