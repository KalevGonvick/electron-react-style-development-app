/* Main Process */

const electron = require('electron')
const app = electron.app
const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const BrowserWindow = electron.BrowserWindow
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			nodeIntegration: false,
			preload: __dirname + '/preload.js'
		}
	});

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`,
  );

  mainWindow.on('closed', () => {
    mainWindow = null
  });
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('did-finish-load', ()=>{
	ipcMain.send('asynchronous-message', 'pong')
});

ipcMain.on('asynchronous-message', (event, arg) => {
	console.log("main process: " + arg)
	event.reply('asynchronous-message', 'pong')
	//event.returnValue = 'pong'
});

ipcMain.on('synchronous-message', (event, arg) => {
  console.log(arg) // prints "ping"
  event.returnValue = 'pong'
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
