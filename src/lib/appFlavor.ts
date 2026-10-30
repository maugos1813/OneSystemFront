import { Capacitor } from "@capacitor/core";

/**
 * Which Android app is running this website. The OneTrack app (android flavor "onetrack") is the same site opened in
 * its own wrapper that adds "OneTrackApp" to the user agent (android/app/src/onetrack/assets/capacitor.config.json):
 * there the GPS sections are all there is, with none of the OneSystec workspace around them.
 */
export const isOneTrackApp = Capacitor.isNativePlatform() && navigator.userAgent.includes("OneTrackApp");

/** The OneTrack app built before its package was registered in Firebase has no push: the wrapper says so. */
export const pushUnavailable = isOneTrackApp && navigator.userAgent.includes("NoPush");
