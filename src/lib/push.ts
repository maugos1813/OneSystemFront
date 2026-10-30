import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken, unregisterPushToken } from "./api";
import { pushUnavailable } from "./appFlavor";

let currentToken: string | null = null;
let listening = false;

/** Android channel the server sends alerts to (see push.service.ts): high importance so it shows up on screen. */
const CHANNEL_ID = "alerts";

/**
 * Asks to show notifications and registers this phone with the server. Only does anything inside the Android app
 * (the Capacitor wrapper); in a normal browser it is a no-op. Safe to call on every sign-in.
 */
export async function enablePush(): Promise<void> {
  if (!Capacitor.isNativePlatform() || pushUnavailable) return;
  try {
    let status = await PushNotifications.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== "granted") return;

    if (!listening) {
      listening = true;
      await PushNotifications.addListener("registration", ({ value }) => {
        currentToken = value;
        void registerPushToken(value).catch(() => undefined);
      });
      await PushNotifications.addListener("registrationError", (error) => {
        console.warn("No se pudo registrar el teléfono para notificaciones", error);
      });
      // Tapping a notification opens the screen it names (an alert opens Alertas).
      await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const url = notification.data?.url;
        if (typeof url === "string" && url.startsWith("/")) window.location.assign(url);
      });
    }

    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Alertas",
      description: "Alertas de tu flota y vencimientos",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    await PushNotifications.register();
  } catch (error) {
    console.warn("Las notificaciones no están disponibles", error);
  }
}

/** Stops notifications for whoever is signing out. Must run while the session is still valid. */
export function disablePush(): void {
  if (!Capacitor.isNativePlatform() || !currentToken) return;
  const token = currentToken;
  currentToken = null;
  void unregisterPushToken(token).catch(() => undefined);
}
