import { Capacitor } from "@capacitor/core";
import { rememberedLanguage, translate } from "../i18n";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken, unregisterPushToken } from "./api";
import { pushUnavailable } from "./appFlavor";

let currentToken: string | null = null;
let listening = false;

/** Android channel the server sends alerts to (see push.service.ts): high importance so it shows up on screen. */
const CHANNEL_ID = "alerts";
/** The channel of the urgent notices (the GPS is disconnected): maximum importance, so they ring and show over whatever is on screen. */
const URGENT_CHANNEL_ID = "alerts-urgent";

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
      name: translate(rememberedLanguage(), "push.channelAlerts"),
      description: translate(rememberedLanguage(), "push.channelAlertsDesc"),
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    await PushNotifications.createChannel({
      id: URGENT_CHANNEL_ID,
      name: translate(rememberedLanguage(), "push.channelUrgent"),
      description: translate(rememberedLanguage(), "push.channelUrgentDesc"),
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
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
