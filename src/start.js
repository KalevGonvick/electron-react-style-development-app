/* Main Process */

const electron = require('electron')
const app = electron.app
const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const natural = require('natural');
const unique = require('array-unique');

let mainWindow
var wordTokenizer = new natural.WordTokenizer();

function cleanArrayInices(array) {
	var filtered = array.filter(function(value, index, arr) {
		return value !== '\n';
	});
	return filtered;
}

function getWorkTokens(array) {
	var arrLen = array.length;
	var tokens = [];
	for(var i = 0; i < arrLen; i++) {
		tokens[i] = wordTokenizer.tokenize(array[i]);
	}
	return tokens;
}

function getFullCorpus(array) {
	var arrLen = array.length;
	var full_corp = []
	for(var i = 0; i < arrLen; i++) {
			full_corp += array[i];
	}
	full_corp = full_corp.split(',');
	return full_corp;
}

function getFrequencies(array) {
	let obj = {};
	let full_arr = [];
	for(let i = 0; i < array.length; i++) {
		let element = array[i];
		if(obj[element] !== undefined) {
			obj[element][1] += 1;
		} else {
			obj[element] = [element, 1];
		}
	}
	for(let i = 0; i < array.length; i++) {
		let element = array[i];
		let current_array = obj[element]
		full_arr.push(current_array);
	}
	full_arr = full_arr.sort(compareSecondColumn);
	full_arr = unique(full_arr).slice(0, 60);
	return full_arr;
}

function getFeatureFreqs(p_array, f_array) {
	let feature_freqs = [];
	for(let i = 0; i < p_array.length; i++) {
			feature_freqs[i] = {};
			let overall = p_array[i].length;
			let count = 0;
			for(let x = 0; x < f_array.length; x++) {
				if(p_array[i] === f_array[x][0]) {
					count++;
				}
				// get counts of features in each para
			}
	}

}

function compareSecondColumn(a, b) {
    if (a[1] === b[1]) {
        return 0;
    }
    else {
        return (a[1] > b[1]) ? -1 : 1;
    }
}

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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

/* setup listener for ipcCalls */
ipcMain.on('asynchronous-message', (event, arg) => {
	event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('diction-analysis', (event, arg) => {
	var array_text = arg[2];
	var clean_array_text = cleanArrayInices(array_text);
	var paragraph_text_tokens = getWorkTokens(clean_array_text);
	var whole_corpus = getFullCorpus(paragraph_text_tokens);
	var whole_corpus_freq_dist = getFrequencies(whole_corpus);
	var feature_freqs = getFeatureFreqs(paragraph_text_tokens, whole_corpus_freq_dist);
	console.log(feature_freqs);
});

ipcMain.on('pacing-analysis', (event, arg) => {
	console.log(arg);
});


app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
