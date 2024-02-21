const { app, BrowserWindow } = require("electron");
const Index = require("./index");
const PORT = process.env.PORT || 4000;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    center: true,
    autoHideMenuBar: true,
  });

  win.loadURL(`http://localhost:${PORT}`);
};

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

app.disableHardwareAcceleration;
