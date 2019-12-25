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

/* Gets the tokens of each paragraph */
function getWordTokens(array) {
	var arrLen = array.length;
	var tokens = [];
	for(var i = 0; i < arrLen; i++) {

		/* remove '\n' paragraphs */
		if(array[i] !== '\n') {
			tokens.push(tbankTokenizer.tokenize(array[i]));
		}
	}
	return tokens;
}

/* Appends each paragraph into a single corpus */
function getFullCorpus(array) {
	var full_corp = []

	/* a 2d array of each paragraph and word tokens is pushed onto a single array */
	for(var i = 0; i < array.length; i++) {
		for(var x = 0; x < array[i].length; x++) {
			full_corp.push(array[i][x])
		}
	}
	return full_corp;
}

/* get the features of the full corpus */
function getFeatures(array) {
	let obj = {};
	let full_arr = [];

	/* get counts and put in object */
	for(let i = 0; i < array.length; i++) {
		let element = array[i];
		if(obj[element] !== undefined) {
			obj[element][1] += 1;
		} else {
			obj[element] = [element, 1];
		}
	}

	/* put he counts into an array */
	for(let i = 0; i < array.length; i++) {
		let element = array[i];
		let current_array = obj[element]
		full_arr.push(current_array);
	}

	/* sort by the most freqeunt and take only the top 30 words */
	full_arr = full_arr.sort(compareIndexValues);
	full_arr = unique(full_arr).slice(0, 30);
	return full_arr;
}

/* get the frequency of features in each of the paragraphs */
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

/* gets the mean and standard deviations of the paragraphs */
function getCorpusStats(f_freqs, f_names, p_array) {
	var corpus_features = {};

	/* for each feature, get the stats of each paragraph*/
	for(let i = 0; i < f_names.length; i++) {
		corpus_features[f_names[i]] = {}
		var feature_average = 0;

		/* get mean */
		for(let x = 0; x < p_array.length; x++) {
			feature_average += f_freqs[x][f_names[i]];
		}
		feature_average = feature_average / p_array.length
		corpus_features[f_names[i]]['Mean'] = feature_average;

		/* get standard deviation */
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

/* get the z-scores using mean and standard deviation */
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

/* get the paragraph that is the most differnt from them all */
function getOutlier(z_scores, p_array, f_names, c_features, k_array) {

	/* object that contains the paragraphs farthest paragraph delta value from it */
	let largestDiff = {}

	/* loop through each of the paragraphs as the selected 'test' case */
	for(let i = 0; i < p_array.length; i++) {

		/* the current paragraphs zscore */
		let current_paragraph = z_scores[i];

		/* a single row for the paragraph */
		let largest_paragraph_delta = {}

		/* initialize the paragraph number and zscore */
		largest_paragraph_delta['paragraph'] = -1;
		largest_paragraph_delta['delta'] = -1;

		/* loop through each of the paragraphs to compare the the 'test' case paragraph*/
		for(let x = 0; x < p_array.length; x++) {

			/* initialize the delta score */
			let delta = 0;

			/* loop through each feature, and get the total delta */
			for(let y = 0; y < f_names.length; y++) {
				if(current_paragraph !== z_scores[x]) {
					delta += Math.abs((current_paragraph[f_names[y]] - z_scores[x][f_names[y]]));
				}
			}
			delta = delta / f_names.length;

			/* if the calculated delta is bigger than the last delta (or if its the first one calculated), then set that one as the largest */
			if(largest_paragraph_delta['delta'] !== -1) {
				if(delta > largest_paragraph_delta['delta']) {
					largest_paragraph_delta['paragraph'] = x;
					largest_paragraph_delta['key'] = k_array[x];
					largest_paragraph_delta['delta'] = delta;
				}
			} else {
				largest_paragraph_delta['paragraph'] = x;
				largest_paragraph_delta['delta'] = delta;
				largest_paragraph_delta['key'] = k_array[x];
			}
		}

		/* save each of the largest deltas for each paragraph on an object */
		largestDiff[i] = [largest_paragraph_delta['paragraph'], largest_paragraph_delta['key']];
	}
	return largestDiff;
}

/* compare index values for sorting */
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
	var array_text = arg['paragraph_array'];
	var array_key = arg['key_array'];

	/* tokens of each paragraph */
	var paragraph_text_tokens = getWordTokens(array_text);

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
		corpus_features,
		array_key
	);
	event.reply('diction-reply', {
		"stats": outlierParagraph,
		"paragraph_count": paragraph_text_tokens.length});
});

ipcMain.on('pacing-analysis', (event, arg) => {
	console.log(arg);
});


app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
