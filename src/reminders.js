import { savePush, removePush, local } from "./api.js";

// Dinner reminders use web push. On iPhone this only works once the app is added to the Home Screen.
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const remindersOn = () => Boolean(local.get("ft-push"));

export async function turnOnReminders(code, vapidPublicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your phone's settings for this app.");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
  await savePush(code, sub.toJSON());
  local.set("ft-push", sub.endpoint);
}

export async function turnOffReminders(code) {
  const endpoint = local.get("ft-push");
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {}
  if (endpoint && code) await removePush(code, endpoint).catch(() => {});
  local.remove("ft-push");
}
