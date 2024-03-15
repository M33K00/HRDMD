const { app, BrowserWindow } = require("electron");
const Index = require("./index");
const path = require("path");
const PORT = process.env.PORT || 4000;
const {
  setupTitlebar,
  attachTitlebarToWindow,
} = require("custom-electron-titlebar/main");

setupTitlebar();
function createWindow() {
  const win = new BrowserWindow({
    //titleBarStyle: "hidden",
    //titleBarOverlay: true,
    width: 1600,
    height: 900,
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true,
      //sandbox: false,
      //preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setMinimumSize(1280, 720);

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

//Global exception handler
process.on("uncaughtException", function (err) {
  console.log(err);
});
