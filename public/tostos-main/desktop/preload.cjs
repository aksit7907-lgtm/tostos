// Мост между страницей и системой. В страницу попадают только эти функции.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tostoDesktop", {
  platform: process.platform,
  /** Подписка на ссылки tosto://... (возврат после входа через Google). Возвращает функцию отписки. */
  onDeepLink(cb) {
    const handler = (_e, url) => cb(url);
    ipcRenderer.on("tosto:deeplink", handler);
    // Если приложение запустили самой ссылкой, она уже ждёт в главном процессе.
    ipcRenderer.invoke("tosto:take-pending-link").then((url) => {
      if (url) cb(url);
    });
    return () => ipcRenderer.removeListener("tosto:deeplink", handler);
  },
  /** Открыть адрес в обычном браузере (нужно для входа через Google). */
  openExternal(url) {
    return ipcRenderer.invoke("tosto:open-external", url);
  },
  /** Число непрочитанных на значке приложения (macOS) и мигание окна. */
  setBadge(count) {
    ipcRenderer.send("tosto:badge", Number(count) || 0);
  },
  /** Системное уведомление; по нажатию окно выходит на передний план. */
  notify(title, body) {
    ipcRenderer.send("tosto:notify", { title: String(title), body: String(body) });
  },
  onNotificationClick(cb) {
    const handler = () => cb();
    ipcRenderer.on("tosto:notification-click", handler);
    return () => ipcRenderer.removeListener("tosto:notification-click", handler);
  },
});
