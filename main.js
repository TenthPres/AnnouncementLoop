const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const debug = /--debug/.test(process.argv[2]);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let loopWindow;

function createWindow () {

    const displays = electron.screen.getAllDisplays();
    for (let di in displays) {
        displays[di].diff = Math.abs(displays[di].bounds.height / displays[di].bounds.width - .5625);
        displays[di].diff += Math.abs(displays[di].bounds.height-1080) * .1;
    }

    const displayToShowOn = displays.sort(function(a, b) {
        if (a.diff < b.diff) return -1;
        if (a.diff > b.diff) return 1;
        return 0;
    })[0];

    const appIcon = path.join(__dirname, 'assets/icons/icon.ico');

    loopWindow = new BrowserWindow({
        x: displayToShowOn.bounds.x + 50,
        y: displayToShowOn.bounds.y + 50,
        kiosk: true,
        show: false,
        backgroundColor:'#000000',
        minimizable: false,
        icon: appIcon,
        webPreferences: {
            nodeIntegration: true, // TODO this is hypothetically insecure.
            contextIsolation: false,
        }
    });

    loopWindow.setMenu(null);

    loopWindow.once('ready-to-show', () => {
        loopWindow.show()
    });

    loopWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Emitted when the window is closed.
    loopWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        loopWindow = null
    });

    // Open the DevTools.
    if (debug)
        loopWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});


///
//The connection to the updating module:
require('update-electron-app')({notifyUser: false})

//An event handler to restart when there's an update downloaded:
electron.autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    // update and restart app
    const { app, autoUpdater, dialog } = require('electron');

    const server = 'https://update.electronjs.org'
    const url = `${server}/update/${process.platform}/${app.getVersion()}`

    autoUpdater.setFeedURL({ url })

    setInterval(() => {
        autoUpdater.checkForUpdates()
    }, 10 * 60 * 1000)

    //Show the message prompt dialogue:
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        const dialogOpts = {
          type: 'info',
          //   buttons: ['Restart', 'Later'],
          title: 'Application Update',
          message: process.platform === 'win32' ? releaseNotes : releaseName,
          detail: 'A new version has been downloaded. The application must restart to apply the updates. Restarting...'
        }
      
        dialog.showMessageBox(dialogOpts).then((returnValue) => {
            //   if (returnValue.response === 0) autoUpdater.quitAndInstall()

            let date = new Date();
            let day = date.getDay();
            let hour = date.getHours();
            // console.log(day);
            // console.log(hour);

            let timeout;

            if(hour >= 22){     //Start the updates if after 10pm
                timeout = setTimeout(autoUpdater.quitAndInstall, 5000);
            }
        })
    })

    // function restartAndUpdate() {
    //     autoUpdater.quitAndInstall();
    // }

    autoUpdater.on('error', message => {
        console.error('There was a problem updating the application')
        console.error(message)
    })
})


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.