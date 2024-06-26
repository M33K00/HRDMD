const { app, BrowserWindow, session } = require("electron");
const server = require("./index");
const path = require("path");
const PORT = 3939;

function createWindow() {
  const customSession = session.fromPartition("persist:my-cache-session", {
    cache: true,
  });

  const win = new BrowserWindow({
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

  win.setMinimumSize(1600, 900);

  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  createWindow();

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
