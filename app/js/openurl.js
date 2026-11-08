// Open a web address with the TV's browser (or any app that handles "view"). Tries the system's choice first, then the Samsung browser (org.tizen.browser).
// Not verified on the TV yet. In the desktop demo it opens a new tab.
import { tv, demo } from "./state.js";

const APP_IDS = [null, "org.tizen.browser"];

/** callbacks: {opening(), failed()} (both optional). */
export function openUrl(url, callbacks = {}, attempt = 0) {
  if (demo) { window.open(url, "_blank"); if (callbacks.opening) callbacks.opening(); return; }
  if (!tv?.application || attempt >= APP_IDS.length) { if (callbacks.failed) callbacks.failed(); return; }
  try {
    const control = new tv.ApplicationControl("http://tizen.org/appcontrol/operation/view", url, null, null, null);
    tv.application.launchAppControl(control, APP_IDS[attempt], () => { if (callbacks.opening) callbacks.opening(); }, () => openUrl(url, callbacks, attempt + 1));
  } catch (error) { openUrl(url, callbacks, attempt + 1); }
}
