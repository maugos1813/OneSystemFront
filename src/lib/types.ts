import type { ModuleKey } from "./modules";
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
  /** The S/N printed on the label (not the IMEI). */
  serialNumber: string | null;
  firmware: string | null;
  status: DeviceStatus;
  source: DeviceSource;
  lastSeenAt: string | null;
  /** When the device confirmed it measures harsh driving itself (Green Driving); null while it does not. */
  greenDrivingSince?: string | null;
  createdAt: string;
}

/** Latest value of one IO element a device reported, with when it last carried it. */
export interface IoReading {
  id: number;
  value: number | string;
  ts: string;
}

export interface DeviceDetail {
  device: Device;
  vehicle: { id: string; name: string; plate: string | null; fleetGroup: string | null } | null;
  /** Null for accounts that can't see the SIMs section, as well as for a device with no SIM. */
  sim: { id: string; operator: string; iccid: string; phoneNumber: string | null } | null;
  lastPosition: {
    ts: string;
    lat: number;
    lng: number;
    speed: number;
    angle: number;
    altitude: number;
    satellites: number | null;
  } | null;
  io: IoReading[];
  /** Newest first. */
  events: DeviceEvent[];
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
  /** The client's logo as a data URL, or null until they upload one. */
  orgLogo: string | null;
  /** This user's own logo (a client such as DHL); when set it replaces the organization's in their top bar. */
  userLogo: string | null;
  /** The OneTrack sections this user may use (everything for owner/admin). */
  modules: ModuleKey[];
  /** The language the app is shown in for this user; chosen by an admin. */
  language: "es" | "it";
}

/** A Gamonal vehicle a client sees on the map because the admin of Gamonal Driver switched it on there. Read-only. */
export interface SharedVehicle {
  plate: string;
  lat: number;
  lng: number;
  speed: number | null;
  ignition: boolean | null;
  direction: number | null;
  updatedAt: string | null;
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
  /** null = full access to the whole fleet; otherwise the key only sees that área. */
  allowedArea: string | null;
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
  deviceAlarmsEnabled: boolean;
  maintenanceEnabled: boolean;
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
  /** The member's own logo as a data URL, or null. */
  logo: string | null;
  /** The OneTrack sections the member may use (everything for owner/admin). */
  modules: ModuleKey[];
  /** The language the member sees the app, the alerts and the emails in. */
  language: "es" | "it";
  createdAt: string;
  /** Only meaningful for role "viewer"/"manager" — owner/admin always see every product the org has. */
  productKeys: string[];
}

export type DrivingQuality = "full" | "speeding_only" | "insufficient_data" | "no_data";

export interface DrivingScores {
  overall: number;
  /** null when the device reports too sparsely to detect harsh events. */
  harshBraking: number | null;
  harshAcceleration: number | null;
  harshCornering: number | null;
  speeding: number;
  grade: string;
}

export interface DrivingIncidentCounts {
  harshBraking: number | null;
  harshAcceleration: number | null;
  harshCornering: number | null;
  speeding: number;
}

/** One vehicle's driving style over a period, as calculated by the server. */
export interface VehicleDrivingStyle {
  vehicleId: string;
  name: string;
  plate: string | null;
  fleetGroup: string | null;
  /** "velocity": the numbers are Radius Velocity's own report; "onetrack": calculated here from the GPS positions. */
  source?: "onetrack" | "velocity";
  /** What found the harsh events: the device's own sensor, the GPS positions, or Velocity's devices. */
  eventSource?: "device" | "gps" | "velocity";
  /** For "device": the moment its own measurement started (what the score is judged from). */
  measuredSince?: string | null;
  /** "per_hour": Velocity's formula (events per hour of driving); "per_100km": OneTrack's original (incidents per 100 km). */
  scoring?: "per_hour" | "per_100km";
  samples: number;
  distanceKm: number;
  drivingHours: number;
  trips: number;
  quality: DrivingQuality;
  scores: DrivingScores | null;
  incidents: DrivingIncidentCounts;
  incidentsPer100Km: DrivingIncidentCounts | null;
}

export interface DrivingStyleResponse {
  speedLimitKmh: number;
  from: string;
  to: string;
  vehicles: VehicleDrivingStyle[];
  rules: { pointsPerIncidentPer100Km: number; minDistanceKm: number; velocityMinHours?: number };
}

/** A SIM card, as listed. PIN/PUK are never part of it — only whether they are stored. */
export interface SimCard {
  id: string;
  deviceId: string | null;
  device: { imei: string; model: string } | null;
  vehicle: { id: string; name: string; plate: string | null } | null;
  operator: string;
  iccid: string;
  phoneNumber: string | null;
  nmu: string | null;
  hasPin: boolean;
  hasPuk: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimSecrets {
  pin: string | null;
  puk: string | null;
}

// --- Maintenance ---

/** ok = green, soon = orange, due = red (about to be due), overdue = red (past it). */
export type MaintenanceState = "ok" | "soon" | "due" | "overdue" | "unknown";

export interface PlanStatus {
  state: MaintenanceState;
  dueKm: number | null;
  /** Negative once past the due point. */
  kmRemaining: number | null;
  dueDate: string | null;
  daysRemaining: number | null;
  /** 0 = just done, 1 = due, above 1 = overdue. */
  usedFraction: number | null;
}

export interface MaintenancePlan {
  id: string;
  vehicleId: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDoneAt: string | null;
  lastDoneKm: number | null;
  notes: string | null;
  /** Where the km come from: the car's own odometer (OBD) or the GPS route counted since the service. */
  kmSource: "obd" | "gps";
  /** Km driven since the last service, when it can be told. */
  kmSince: number | null;
  /** The dashboard reading now: the km of the last service plus what has been driven since. */
  dashboardKm: number | null;
  /** The service was before the GPS started counting for this vehicle, so the km since it fall short. */
  partialCoverage: boolean;
  status: PlanStatus;
}

export interface VehicleMaintenance {
  vehicleId: string;
  name: string;
  plate: string | null;
  kmSource: "obd" | "gps";
  /** The car's own odometer through OBD; null if the device doesn't read it. */
  trackerKm: number | null;
  offsetKm: number;
  /** Dashboard-scale odometer (OBD + offset), when the car's own is read. */
  odometerKm: number | null;
  /** All the km the GPS has counted for this vehicle, and since which day (YYYY-MM-DD). */
  gpsKmTotal: number;
  gpsCoverageFrom: string | null;
  plans: MaintenancePlan[];
}

export interface MaintenanceRecord {
  id: string;
  planId: string;
  doneAt: string;
  odometerKm: number | null;
  notes: string | null;
  createdAt: string;
}

export type DeviceCommandStatus = "pending" | "sent" | "confirmed" | "failed" | "expired" | "cancelled";

/** An order given to a tracker's output (lock/unlock of the vehicle), with how far it got. */
export interface DeviceCommand {
  id: string;
  kind: "immobilize" | "release" | "green_driving";
  /** The text sent to the device. */
  command: string;
  status: DeviceCommandStatus;
  response: string | null;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  answeredAt: string | null;
}

export type DocumentKind = "seguro" | "revision" | "bollo" | "tacografo" | "otro";
export type DocumentState = "ok" | "soon" | "overdue";

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  kind: DocumentKind;
  label: string | null;
  /** What to show: the kind's name, or the label of an "otro". */
  name: string;
  /** "YYYY-MM-DD" */
  expiresOn: string;
  remindDays: number;
  notes: string | null;
  status: { state: DocumentState; daysLeft: number };
}

export interface VehicleWithDocuments {
  vehicleId: string;
  name: string;
  plate: string | null;
  documents: VehicleDocument[];
}

/** A Bluetooth beacon assigned to a driver. */
export interface DriverBeacon {
  id: string;
  beaconId: string;
  driverName: string;
  /** Where to call the driver from the vehicle's panel. */
  phone: string | null;
  createdAt: string;
}

/** A beacon the trackers heard recently, with its driver if it is already assigned. */
export interface DetectedBeacon {
  beaconId: string;
  driverName: string | null;
  registeredId: string | null;
  lastSeen: string;
  vehicle: { id: string; name: string; plate: string | null };
  avgRssi: number | null;
  sightings: number;
}

export interface NamedDriver {
  name: string;
  phone: string | null;
  /** Null for a driver Gamonal Driver names (no beacon involved). */
  beaconId: string | null;
  presence: number | null;
  avgRssi: number | null;
}

/** Who drove a vehicle in a period: Gamonal Driver's answer, or else the beacons its tracker heard while it moved. */
export interface VehicleDriver {
  vehicleId: string;
  from: string;
  to: string;
  movingScans: number;
  /** "low" when several drivers were in the cab: the first is only the probable one. */
  confidence: "high" | "low" | null;
  source: "driver" | "beacon" | null;
  driver: NamedDriver | null;
  others: NamedDriver[];
  /** When Gamonal Driver names someone and the beacon heard somebody else: who the beacon heard. */
  beaconDriver: NamedDriver | null;
}

/** One service of Gamonal Driver on a vehicle. */
export interface VehicleUsage {
  driver: { name: string; phone: string | null; active: boolean };
  from: string;
  /** Null when the Driver has no end time for it. */
  to: string | null;
  /** The hours the driver declared, or only an estimate from departure and ETA. */
  declared: boolean;
  /** The service started on another van and ended on this one, or the other way round: the switch time is unknown. */
  switched: boolean;
  status: string;
}

/** A beacon one tracker heard, with the driver it belongs to if it is registered. */
export interface BeaconInVehicle {
  beaconId: string;
  driverName: string | null;
  phone: string | null;
  registeredId: string | null;
  firstSeen: string;
  lastSeen: string;
  /** Beacon reports it appeared in, and how many of those were taken while the vehicle was moving. */
  sightings: number;
  movingSightings: number;
  /** Mean RSSI in dBm: about -50 to -70 close by, -90 and below far away. */
  avgRssi: number | null;
}

/** One vehicle with a Teltonika tracker and the beacons it heard in the period. */
export interface VehicleBeacons {
  vehicle: { id: string; name: string; plate: string | null; model: string };
  /** The tracker's last beacon report in the period (even one with no beacons); null if it sent none. */
  lastReport: string | null;
  beacons: BeaconInVehicle[];
}
