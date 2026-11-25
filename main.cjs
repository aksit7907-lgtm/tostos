// Главный процесс приложения Tosto для компьютера (Windows, macOS).
// Показывает тот же сайт, что и Android-версия: собранный SPA из папки web/.
const { app, BrowserWindow, Menu, Notification, ipcMain, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "app"; // внутренний адрес страницы: app://tosto/
const APP_ORIGIN = `${APP_SCHEME}://tosto`;
const LINK_SCHEME = "tosto"; // ссылки возврата после входа: tosto://auth-callback?...
const WEB_ROOT = path.join(__dirname, "web");

// Свой протокол нужен, чтобы у страницы был нормальный адрес (хранилище, куки, Supabase),
// а не file://.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

let win = null;
let pendingLink = null;

function linkFromArgv(argv) {
  return argv.find((a) => typeof a === "string" && a.startsWith(`${LINK_SCHEME}://`)) ?? null;
}

function deliverLink(url) {
  if (!url) return;
  if (win && !win.webContents.isLoading()) {
    win.webContents.send("tosto:deeplink", url);
  } else {
    pendingLink = url;
  }
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
}

// Регистрируем tosto:// за приложением. В режиме разработки на Windows нужны аргументы запуска.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(LINK_SCHEME);
}

// Одно окно: вторая попытка запуска (в том числе по ссылке из браузера) передаётся первому.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => deliverLink(linkFromArgv(argv)));

  // macOS присылает ссылку отдельным событием.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    deliverLink(url);
  });

  pendingLink = linkFromArgv(process.argv);

  app.whenReady().then(() => {
    // app://tosto/... -> файлы из web/. Неизвестные пути отдают index.html (SPA).
    protocol.handle(APP_SCHEME, (request) => {
      const { pathname } = new URL(request.url);
      let file = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
      if (!file.startsWith(WEB_ROOT)) return new Response("Forbidden", { status: 403 });
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB_ROOT, "index.html");
      return net.fetch(pathToFileURL(file).toString());
    });

    Menu.setApplicationMenu(process.platform === "darwin" ? buildMacMenu() : null);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else win?.show();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: "#0a0a0a",
    title: "Tosto",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.on("did-finish-load", () => {
    if (pendingLink) {
      win.webContents.send("tosto:deeplink", pendingLink);
      pendingLink = null;
    }
  });

  // Внешние ссылки открываем в браузере, а не внутри приложения.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  win.on("closed", () => {
    win = null;
  });

  void win.loadURL(`${APP_ORIGIN}/`);
}

function buildMacMenu() {
  return Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]);
}

ipcMain.handle("tosto:take-pending-link", () => {
  const url = pendingLink;
  pendingLink = null;
  return url;
});

ipcMain.handle("tosto:open-external", async (_e, url) => {
  if (typeof url === "string" && /^https:\/\//i.test(url)) await shell.openExternal(url);
});

ipcMain.on("tosto:badge", (_e, count) => {
  if (process.platform === "darwin" || process.platform === "linux") app.setBadgeCount(count);
});

ipcMain.on("tosto:notify", (_e, { title, body }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: true });
  n.on("click", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.send("tosto:notification-click");
  });
  n.show();
});
