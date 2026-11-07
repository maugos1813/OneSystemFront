/**
 * How a device is named on screen. OneSystec sees the IMEI; a client never receives it (the server sends it empty), so its
 * devices are told apart by model plus the start of their id, which is no identifier of the hardware.
 */
export function deviceLabel(device: { id: string; imei: string; model: string }): string {
  return device.imei || `${device.model} · ${device.id.slice(0, 4)}`;
}
