const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, shell, nativeImage } = require("electron");
const path = require("path");
const Store = require("electron-store");

const store = new Store({
  name: "price-tracker-settings",
  defaults: {
    workerUrl: "",
    apiKey: "",
    theme: "light",
    notifiedProductIds: [],
  },
});

// Windows needs this set explicitly for notifications to show the
// right app name and icon, otherwise they show up as generic
// "Electron" notifications.
app.setAppUserModelId("com.tellez.pricetrackerwidget");

let mainWindow = null;
let tray = null;
let pollTimer = null;

const POLL_INTERVAL_MS = 60 * 60 * 1000; // check in with the worker once an hour while the app is open

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 700,
    minHeight: 480,
    icon: path.join(__dirname, "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Closing the window just hides it, the app keeps running in the
  // tray so it can keep polling and notifying in the background.
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, "assets", "tray-icon.png");
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip("Price Tracker");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Price Tracker",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: "Check Prices Now",
      click: () => {
        pollAndNotify();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow.show();
  });
}

function getApiConfig() {
  return {
    workerUrl: store.get("workerUrl", "").replace(/\/+$/, ""),
    apiKey: store.get("apiKey", ""),
  };
}

async function apiFetch(pathname, options = {}) {
  const { workerUrl, apiKey } = getApiConfig();
  if (!workerUrl || !apiKey) {
    throw new Error("Worker URL and API key are not configured yet.");
  }

  const response = await fetch(`${workerUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body;
}

async function pollAndNotify() {
  try {
    const { products } = await apiFetch("/products");
    checkForPriceAlerts(products);

    if (mainWindow) {
      mainWindow.webContents.send("products-updated", products);
    }
  } catch (err) {
    // A failed background poll shouldn't crash the app, it'll just
    // try again next interval. The renderer surfaces errors itself
    // when the user is actively looking at the window.
    console.error("Background poll failed:", err.message);
  }
}

function checkForPriceAlerts(products) {
  const notified = new Set(store.get("notifiedProductIds", []));

  for (const product of products) {
    if (product.hitTarget && !notified.has(product.id)) {
      fireNotification(product);
      notified.add(product.id);
    }

    // Reset so a future price drop below target notifies again,
    // even if it previously dropped and came back up.
    if (!product.hitTarget && notified.has(product.id)) {
      notified.delete(product.id);
    }
  }

  store.set("notifiedProductIds", [...notified]);
}

function fireNotification(product) {
  const notification = new Notification({
    title: "Price target hit",
    body: `${product.nickname} is now $${product.currentPrice}, at or below your target of $${product.targetPrice}.`,
    icon: path.join(__dirname, "assets", "icon.ico"),
  });

  notification.on("click", () => {
    mainWindow.show();
  });

  notification.show();
}

// --- IPC handlers, these are the calls the renderer makes through preload.js ---

ipcMain.handle("get-settings", () => ({
  workerUrl: store.get("workerUrl", ""),
  apiKey: store.get("apiKey", ""),
  theme: store.get("theme", "light"),
}));

ipcMain.handle("save-settings", (event, settings) => {
  if (settings.workerUrl !== undefined) store.set("workerUrl", settings.workerUrl);
  if (settings.apiKey !== undefined) store.set("apiKey", settings.apiKey);
  if (settings.theme !== undefined) store.set("theme", settings.theme);
  return true;
});

ipcMain.handle("get-products", async () => {
  const { products } = await apiFetch("/products");
  return products;
});

ipcMain.handle("add-product", async (event, data) => {
  const { product } = await apiFetch("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return product;
});

ipcMain.handle("update-product", async (event, id, data) => {
  const { product } = await apiFetch(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return product;
});

ipcMain.handle("delete-product", async (event, id) => {
  await apiFetch(`/products/${id}`, { method: "DELETE" });
  return true;
});

ipcMain.handle("check-product", async (event, id) => {
  const { product } = await apiFetch(`/products/${id}/check`, { method: "POST" });
  return product;
});

ipcMain.handle("open-external", (event, url) => {
  shell.openExternal(url);
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();
  createTray();
  pollAndNotify(); // immediate check on launch, no need to wait a full hour
  pollTimer = setInterval(pollAndNotify, POLL_INTERVAL_MS);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Intentionally does nothing on Windows/Linux, the tray keeps the
  // app alive. On macOS this is normal behavior anyway.
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (pollTimer) clearInterval(pollTimer);
});
