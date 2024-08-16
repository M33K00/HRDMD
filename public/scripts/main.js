const { app, BrowserWindow, session, Tray, Menu } = require("electron");
const server = require("./index");
const path = require("path");
const PORT = 3939;

let mainWindow;
let tray;

function createWindow() {
  const customSession = session.fromPartition("persist:my-cache-session", {
    cache: true,
  });

  mainWindow = new BrowserWindow({
    maxHeight: 1080,
    maxWidth: 1920,
    width: 1600,
    height: 900,
    icon: path.join(__dirname, "../images/logo.ico"),
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true,
      session: customSession, // Use the custom session with caching
    },
  });

  mainWindow.setMinimumSize(1600, 900);
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Minimize to tray on close
  mainWindow.on("close", function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, "../images/logo.ico")); // Replace with your tray icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: function () {
        mainWindow.show();
      },
    },
    {
      label: "Quit",
      click: function () {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Your Electron App");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

try {
  require("electron-reloader")(module);
} catch {}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Global exception handler
process.on("uncaughtException", function (err) {
  console.log(err);
});
