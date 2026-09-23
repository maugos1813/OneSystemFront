export type DeviceStatus = "unclaimed" | "active" | "disabled";

export interface Device {
  id: string;
  orgId: string | null;
  imei: string;
  model: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  orgId: string;
  name: string;
  plate: string | null;
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
  satellites: number;
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
  email: string;
  role: "owner" | "admin" | "viewer";
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
