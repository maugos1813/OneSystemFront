import { Capacitor } from "@capacitor/core";

/**
 * Which Android app is running this website. The OneTrack app (android flavor "onetrack") is the same site opened in
 * its own wrapper that adds "OneTrackApp" to the user agent (android/app/src/onetrack/assets/capacitor.config.json):
 * there the GPS sections are all there is, with none of the OneSystec workspace around them.
 */
export const isOneTrackApp = Capacitor.isNativePlatform() && navigator.userAgent.includes("OneTrackApp");

/** The OneTrack app built before its package was registered in Firebase has no push: the wrapper says so. */
export const pushUnavailable = isOneTrackApp && navigator.userAgent.includes("NoPush");

/**
 * The app was installed from a store: Google Play (its wrapper adds "PlayStore" to the user agent, see MainActivity). Play only allows
 * an app it delivered to be updated by Play, so there it never looks for, offers or downloads an APK from this website.
 */
export const isPlayStoreApp = Capacitor.isNativePlatform() && (navigator.userAgent.includes("PlayStore") || Capacitor.getPlatform() === "ios");

/** Running inside one of the Android apps (as opposed to a browser): their sessions last longer, since the phone is the person's own. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** A phone (one of the apps, or a phone's browser): it is the one that scans the QR of the web's login, so it doesn't show one itself. */
export function isMobileDevice(): boolean {
  return Capacitor.isNativePlatform() || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
}
