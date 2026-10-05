export type DeviceStatus = "unclaimed" | "active" | "disabled";
/** "teltonika": pushes AVL data over our TCP ingestion (rich telemetry: voltage,
 * satellites, odometer, GSM signal). "radius_velocity": pulled from a third-party API
 * that only reports position, speed, direction and ignition — everything else is "—". */
export type DeviceSource = "teltonika" | "radius_velocity";

export interface Device {
  id: string;
  orgId: string | null;
  imei: string;
  model: string;
  status: DeviceStatus;
  source: DeviceSource;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  orgId: string;
  name: string;
  plate: string | null;
  /** Client-contract tag (e.g. "DHL", "UNIVEX") — only set for vehicles synced from Radius Velocity. */
  fleetGroup: string | null;
  deviceId: string | null;
  createdAt: string;
}

/** Raw IO elements keyed by AVL ID (as strings, since they come from a JSON object). */
export type IoData = Record<string, number | string>;

export interface Position {
  id: string;
  deviceId: string;
  ts: string;
  lat: number;
  lng: number;
  altitude: number;
  angle: number;
  /** Null when the source doesn't report it (e.g. Radius Velocity), not "zero satellites". */
  satellites: number | null;
  speed: number;
  priority: number;
  ioData: IoData;
}

// Well-known AVL IDs used in the detail panel — see OneSystemBack's avlIds.ts.
export const AVL_ID = {
  TOTAL_ODOMETER: "16",
  IGNITION: "239",
  EXTERNAL_VOLTAGE: "66",
  BATTERY_VOLTAGE: "67",
} as const;

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "manager" | "viewer";
  /** Hard restriction to one área (e.g. "DHL"/"UNIVEX") — null means unrestricted. */
  allowedArea: string | null;
  orgId: string;
  orgName: string;
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  ts: string;
  type: string;
  payload: IoData;
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Only returned once, right after creation — the server never stores the plaintext key. */
export interface CreatedApiKey extends ApiKey {
  key: string;
}

export interface WorkingHoursDay {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export type WeekdayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type WorkingHours = Record<WeekdayKey, WorkingHoursDay>;

export interface AlertPreferences {
  afterHoursEnabled: boolean;
  deviceOfflineEnabled: boolean;
  deviceOfflineHours: number;
  lowBatteryEnabled: boolean;
  lowBatteryVoltage: number;
  speedingEnabled: boolean;
  speedLimitKmh: number;
  excessiveIdlingEnabled: boolean;
  excessiveIdlingMinutes: number;
  geofenceEnabled: boolean;
}

export interface OrgSettings {
  orgName: string;
  workingHours: WorkingHours;
  alerts: AlertPreferences;
}

export type GeofenceType = "circle" | "polygon";

export interface GeofencePoint {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  orgId: string;
  name: string;
  type: GeofenceType;
  /** Circle-only (null on a polygon geofence). */
  lat: number | null;
  lng: number | null;
  radiusMeters: number | null;
  /** Polygon-only (null on a circle geofence) — a list of rings, so one geofence can
   * cover several disjoint areas (e.g. Milan's Area B, which has a few exclaves). */
  path: GeofencePoint[][] | null;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  createdAt: string;
}

export type ProductType = "internal" | "external";

export interface Product {
  key: string;
  name: string;
  type: ProductType;
  path?: string;
  url?: string;
  ssoEnabled?: boolean;
}

export type TeamRole = "owner" | "admin" | "manager" | "viewer";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  /** Set only for a sub-user created by a "manager" — points at that manager's id. */
  parentUserId: string | null;
  /** Hard access restriction to one área (e.g. "DHL"/"UNIVEX") — null means unrestricted. */
  allowedArea: string | null;
  createdAt: string;
  /** Only meaningful for role "viewer"/"manager" — owner/admin always see every product the org has. */
  productKeys: string[];
}

export interface TollPassage {
  id: string;
  ts: string;
  /** Marked by the org as an unauthorized use of the toll. */
  flagged: boolean;
  /** A GPS report near the gates showed the vehicle slowing through them. */
  confirmed: boolean;
  vehicleId: string;
  vehicleName: string;
  plate: string | null;
  fleetGroup: string | null;
  plazaId: string;
  plazaName: string;
  operator: string | null;
  lat: number;
  lng: number;
}

export interface TollMonthSummary {
  /** "YYYY-MM" */
  month: string;
  total: number;
  flagged: number;
  vehicles: number;
}
