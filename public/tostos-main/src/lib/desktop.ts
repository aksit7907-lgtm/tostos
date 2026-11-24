import { Capacitor } from "@capacitor/core";

/** Мост к системе, который даёт приложение для компьютера (desktop/preload.cjs). В браузере и на телефоне его нет. */
export type TostoDesktop = {
  platform: string;
  onDeepLink: (cb: (url: string) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  setBadge: (count: number) => void;
  notify: (title: string, body: string) => void;
  onNotificationClick: (cb: () => void) => () => void;
};

declare global {
  interface Window {
    tostoDesktop?: TostoDesktop;
  }
}

export const getDesktop = (): TostoDesktop | undefined =>
  typeof window === "undefined" ? undefined : window.tostoDesktop;

export const isDesktopApp = () => !!getDesktop();

// ───────────── Уведомления о сообщениях (компьютер и браузер) ─────────────

const KEY = "tosto:notify";

/** На Android уведомления идут через пуши, поэтому здесь только компьютер и браузер. */
export function notificationsSupported(): boolean {
  if (typeof window === "undefined" || Capacitor.isNativePlatform()) return false;
  return isDesktopApp() || "Notification" in window;
}

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function isNotifyEnabled(): boolean {
  if (!notificationsSupported()) return false;
  // В приложении для компьютера включено по умолчанию, в браузере нужно разрешение.
  if (isDesktopApp()) return stored() !== "off";
  return stored() === "on" && Notification.permission === "granted";
}

/** Включает или выключает уведомления. В браузере сначала просит разрешение; возвращает итоговое состояние. */
export async function setNotifyEnabled(on: boolean): Promise<boolean> {
  let result = on;
  if (on && !isDesktopApp() && "Notification" in window && Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    result = perm === "granted";
  }
  try {
    localStorage.setItem(KEY, result ? "on" : "off");
  } catch {
    // хранилище недоступно
  }
  return result;
}

/** Показывает уведомление, только если окно сейчас не в фокусе. */
export function notifyIncoming(title: string, body: string, tag?: string) {
  if (!isNotifyEnabled()) return;
  if (typeof document !== "undefined" && document.hasFocus()) return;
  const desktop = getDesktop();
  if (desktop) {
    desktop.notify(title, body);
    return;
  }
  try {
    const n = new Notification(title, { body, tag, icon: "/icon-192.png", silent: true });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // не критично
  }
}
