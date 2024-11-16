const { app, BrowserWindow, session, Tray, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const ejs = require('ejs');
const fs = require('fs');

let mainWindow;
let tray;

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Show a message box and quit if another instance is already running
  dialog.showMessageBoxSync({
    type: 'warning',
    buttons: ['OK'],
    title: 'HRDMD',
    message: 'HRDMD is already running.'
  });
  app.quit();  // Exit if another instance is already running
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Show a message box when another instance tries to open
    dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['OK'],
      title: 'HRDMD',
      message: 'HRDMD is already running.'
    });

    // Focus the existing window if another instance is launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

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
        session: customSession,
        preload: path.join(__dirname, 'preload.js') // Preload script
      },
    });

    mainWindow.setMinimumSize(1600, 900);

    // Render the EJS template
    const startPagePath = path.join(__dirname, "../templates/start.ejs");
    ejs.renderFile(startPagePath, {}, {}, (err, str) => {
      if (err) {
        console.error('Error rendering EJS:', err);
        return;
      }
      mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(str));
    });

    // Minimize to tray or quit on close
    mainWindow.on("close", function (event) {
      if (!app.isQuiting) {
        event.preventDefault(); // Prevent the default close action

        const choice = dialog.showMessageBoxSync({
          type: 'question',
          buttons: ['Hide in Tray', 'Quit'],
          defaultId: 0,
          title: 'Confirm',
          message: 'Do you want to quit the app or hide it in the tray?'
        });

        if (choice === 1) { // 'Quit' was selected
          app.isQuiting = true;
          app.quit();
        } else { // 'Hide in Tray' was selected
          mainWindow.hide();
        }
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
          const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Hide in Tray', 'Quit'],
            defaultId: 0,
            title: 'Confirm',
            message: 'Do you want to quit the app or hide it in the tray?'
          });

          if (choice === 1) { // 'Quit' was selected
            app.isQuiting = true;
            app.quit();
          } else { // 'Hide in Tray' was selected
            mainWindow.hide();
          }
        },
      },
    ]);
    tray.setToolTip("HRDMD AIO");
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

  // Handle IPC event to start the server
  ipcMain.handle('start-server', async () => {
    require("./index"); // Start the server here
    mainWindow.loadURL(`http://localhost:3939`); // Load your app after the server starts
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
}
