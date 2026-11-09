import { BarcodeFormat, BarcodeScanner, GoogleBarcodeScannerModuleInstallState } from "@capacitor-mlkit/barcode-scanning";

/** Why a scan gave nothing: the person closed the camera, or this phone can't scan (no Google Play Services / module). */
export type ScanFailure = "cancelled" | "unsupported";

export class ScanError extends Error {
  reason: ScanFailure;
  constructor(reason: ScanFailure) {
    super(reason);
    this.reason = reason;
  }
}

/** Google's scanner module comes with Play Services; if it hasn't been downloaded yet, this waits for it (it is a few MB, once). */
async function ensureScannerModule(onInstalling: () => void): Promise<void> {
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (available) return;
  onInstalling();
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new ScanError("unsupported")), 90_000);
    let remove: (() => void) | null = null;
    function finish(error?: Error) {
      clearTimeout(timeout);
      remove?.();
      if (error) reject(error);
      else resolve();
    }
    void BarcodeScanner.addListener("googleBarcodeScannerModuleInstallProgress", (event) => {
      if (event.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) finish();
      else if (event.state === GoogleBarcodeScannerModuleInstallState.FAILED || event.state === GoogleBarcodeScannerModuleInstallState.CANCELED) {
        finish(new ScanError("unsupported"));
      }
    }).then((handle) => {
      remove = () => void handle.remove();
    });
    BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => finish(new ScanError("unsupported")));
  });
}

/** Opens the phone's QR scanner and returns the text of the code it read. Throws ScanError when nothing was read. */
export async function scanQrText(onInstalling: () => void = () => undefined): Promise<string> {
  try {
    await ensureScannerModule(onInstalling);
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    const text = barcodes[0]?.rawValue;
    if (!text) throw new ScanError("cancelled");
    return text;
  } catch (err) {
    if (err instanceof ScanError) throw err;
    // The plugin rejects with "scan canceled." when the person backs out of the camera.
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    throw new ScanError(message.includes("cancel") ? "cancelled" : "unsupported");
  }
}

/** The code inside what a QR carries: the login page puts `<site>/vincular?c=<code>` in it. Null for any QR that isn't ours. */
export function qrLoginCodeFrom(text: string): string | null {
  const shape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]+$/i;
  const raw = text.trim();
  if (shape.test(raw)) return raw;
  try {
    const code = new URL(raw).searchParams.get("c");
    return code && shape.test(code) ? code : null;
  } catch {
    return null;
  }
}
