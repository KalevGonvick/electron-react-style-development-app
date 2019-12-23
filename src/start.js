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
var tbankTokenizer = new natural.TreebankWordTokenizer();

function getWorkTokens(array) {
	var arrLen = array.length;
	var tokens = [];
	for(var i = 0; i < arrLen; i++) {
		if(array[i] !== '\n') {
			tokens.push(tbankTokenizer.tokenize(array[i]));
		}
	}
	return tokens;
}

function getFullCorpus(array) {
	var arrLen = array.length;
	var full_corp = []
	for(var i = 0; i < arrLen; i++) {
		for(var x = 0; x < array[i].length; x++) {
			full_corp.push(array[i][x])
		}
	}
	return full_corp;
}

function getFeatures(array) {
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
	full_arr = full_arr.sort(compareIndexValues);
	full_arr = unique(full_arr).slice(0, 30);
	return full_arr;
}

function getFeatureFreqs(p_array, f_array) {
	let feature_freqs = [];
	/* loop through each paragraph */
	for(let i = 0; i < p_array.length; i++) {

			/* an object that contains each paragraph feature frequency */
			feature_freqs[i] = {};
			/* the number of tokens in each paragraph */
			let overall = p_array[i].length;
			for(let x = 0; x < f_array.length; x++) {
				let current_feature = f_array[x][0];
				let count = 0;
				for(let y = 0; y < p_array[i].length; y++) {
					if(p_array[i][y] === current_feature) {
						count++;
					}
					feature_freqs[i][current_feature] = (count / overall);
				}
			}
	}
	return feature_freqs;
}

function getFeatureNameList(array) {
	let nameList = []
	for(let i = 0; i < array.length; i++) {
		nameList.push(array[i][0]);
	}
	return nameList;
}

function getCorpusStats(f_freqs, f_names, p_array) {
	var corpus_features = {};
	for(let i = 0; i < f_names.length; i++) {
		corpus_features[f_names[i]] = {}
		var feature_average = 0;
		for(let x = 0; x < p_array.length; x++) {
			feature_average += f_freqs[x][f_names[i]];
		}
		feature_average = feature_average / p_array.length
		corpus_features[f_names[i]]['Mean'] = feature_average;

		var feature_stdev = 0;
		for(let x = 0; x < p_array.length; x++) {
			let diff = f_freqs[x][f_names[i]] - corpus_features[f_names[i]]['Mean'];
			feature_stdev += diff*diff
		}
		feature_stdev /= (p_array.length -1);
		feature_stdev = Math.sqrt(feature_stdev);
		corpus_features[f_names[i]]['StdDev'] = feature_stdev;
	}
	return corpus_features;
}

function getZScores(p_array, f_names, corpus_features, f_freqs) {
	let feature_zscores = [];
	for(let i = 0; i < p_array.length; i++) {
		feature_zscores[i] = {}
		for(let x = 0; x < f_names.length; x++) {
			let feature_val = f_freqs[i][f_names[x]];
			let feature_mean = corpus_features[f_names[x]]['Mean'];
			let feature_stdev = corpus_features[f_names[x]]['StdDev'];
			feature_zscores[i][f_names[x]] = ((feature_val-feature_mean) / feature_stdev);
		}
	}
	return feature_zscores;
}

function getOutlier(z_scores, p_array, f_names, c_features) {
	let paragraph_deltascores = {}
	let largestDiff = {}
	let winnerArray = [];
	for(let i = 0; i < p_array.length; i++) {
		let paragraph_case = z_scores[i];
		let largest_paragraph_delta = {}
		largest_paragraph_delta['paragraph'] = -1;
		largest_paragraph_delta['delta'] = -1;
		let tempDeltaVal = {};
		for(let x = 0; x < p_array.length; x++) {
			let delta = 0;
			for(let y = 0; y < f_names.length; y++) {
				if(paragraph_case !== z_scores[x]) {
					delta += Math.abs((
						paragraph_case[f_names[y]] - z_scores[x][f_names[y]]
					));
				}
			}
			delta = delta / f_names.length;
			if(largest_paragraph_delta['delta'] !== -1) {
				if(delta > largest_paragraph_delta['delta']) {
					largest_paragraph_delta['paragraph'] = x;
					largest_paragraph_delta['delta'] = delta;
				}
			} else {
				largest_paragraph_delta['paragraph'] = x;
				largest_paragraph_delta['delta'] = delta;
			}
			tempDeltaVal[x] = delta;
		}
		largestDiff[i] = largest_paragraph_delta;
		paragraph_deltascores[i] = tempDeltaVal;
	}
	for(let i = 0; i < p_array.length; i++) {
		//largestDiff[i]['paragraph']
	}
	return largestDiff;
}

function compareIndexValues(a, b) {
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

	/* tokens of each paragraph */
	var paragraph_text_tokens = getWorkTokens(array_text);

	/* all paragraphs in one */
	var whole_corpus = getFullCorpus(paragraph_text_tokens);

	/* get features of the entire corpus */
	var features_list = getFeatures(whole_corpus);

	/* array containing the names of all the features */
	var feature_names = getFeatureNameList(features_list);

	/* get the percentage of features in each pargraph */
	var feature_freqs = getFeatureFreqs(paragraph_text_tokens, features_list);

	/* calculate averages and standard deviations */
	var corpus_features = getCorpusStats(
		 feature_freqs,
		 feature_names,
	 	 paragraph_text_tokens);

	/* calculate z-scores  */
	var feature_zscores = getZScores(
		paragraph_text_tokens,
		feature_names,
		corpus_features,
		feature_freqs);

	/* calculate delta between paragraphs */
	var outlierParagraph = getOutlier(
		feature_zscores,
		paragraph_text_tokens,
		feature_names,
		corpus_features
	);
	console.log(outlierParagraph);
});

ipcMain.on('pacing-analysis', (event, arg) => {
	console.log(arg);
});


app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
