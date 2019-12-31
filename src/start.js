/*
* Author - Kalev Gonvick
* Date - 12/20/2019
* This is the main process where te NLP calculations are done.
*/

/* electron-start */
const electron = require('electron')
const app = electron.app
const { ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const BrowserWindow = electron.BrowserWindow
const path = require('path')
/* electron-end */

/* natural-start */
const natural = require('natural');
const Analyzer = require('natural').SentimentAnalyzer;
const stemmer = require('natural').PorterStemmer;
const unique = require('array-unique');
/* natural-end */

let mainWindow
/* tree bank tokenizer */
var tbankTokenizer = new natural.TreebankWordTokenizer();

/* sentence tokenizer */
var sentenceTokenizer = new natural.SentenceTokenizer();

/* sentiment analyzer */
var analyzer = new Analyzer("English", stemmer, "afinn");

/* function summary - tokenizes each sentence in each paragraph into a 3d array
* @Param(array)  	  - array - an array of all paragraphs
* @Return(array) 	  - para  - a 3d array containing the tokens of each sentence in each paragraph
*/
function getSentenceTokens(array) {

	/* array of each paragraph */
	var para = [];
	for(let i = 0; i < array.length; i++) {
		if(array[i] !== '\n') {

			/* array of each sentence in token form */
			let sen = []

			/* tokenizes each paragraph by sentence */
			let current_sentence = sentenceTokenizer.tokenize(array[i]);
			for(let x = 0; x < current_sentence.length; x++) {

				/* tokenizes each sentence by word */
				sen.push(tbankTokenizer.tokenize(current_sentence[x]));
			}
			para.push(sen);
		}
	}
	return para;
}

/* function summary - tokenizes each pargraph
* @Param(array)  	  - array  - an array of all paragraphs
* @Return(array) 	  - tokens - an array of all paragraphs in token form
*/
function getWordTokens(array) {
	var tokens = [];
	for(var i = 0; i < array.length; i++) {

		/* remove '\n' paragraphs */
		if(array[i] !== '\n') {
			tokens.push(tbankTokenizer.tokenize(array[i]));
		}
	}
	return tokens;
}

/* function summary - takes the tokenized paragraphs and pushes everything into a single array
* @Param(array) 	  - array 		- the tokenized paragraphs
* @Return(array) 	  - full_corp - a single array with all tokens
*/
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

/* function summary - 		Returns the base sentiment of the overall document and each paragraph in object form.
* @Param(array) 	  - 		paragraph_array 			- a 2d array that contains the tokens of each sentence in each paragraph.
* @Return(object)   -	  paragraph_sentiments    - an object that contains the total sentiment average of the document as well as the sentiment average of each paragraph.
*/
function getSentiment(paragraph_array) {

	/* Object Holding the paragraph sentiment values*/
	let paragraph_sentiments = {};
	paragraph_sentiments['paragraphs'] = {}
	let total_avg = 0;

	/* loop through each of the paragraphs */
	for(let i = 0; i < paragraph_array.length; i++) {
		let paragraph_avg = 0;
		let current_paragraph = i;

		/* loop through each sentence in each paragraph */
		for(let x = 0; x < paragraph_array[i].length; x++) {
			let temp_result = analyzer.getSentiment(paragraph_array[i][x]);
			paragraph_avg += temp_result;
			total_avg += temp_result;
		}
		paragraph_avg = paragraph_avg / paragraph_array[i].length;
		paragraph_sentiments['paragraphs'][current_paragraph] = paragraph_avg;
	}
	total_avg = total_avg / paragraph_array.length;
	paragraph_sentiments['whole_corpus_average'] = total_avg;
	return paragraph_sentiments;
}

/**/
//function getPacing(array) {
	// TODO: analyze pacing of each sentence in each paragraph and get avg..
//}

/* function summary - gets the frequency of terms in the whole corpus and keeps the top 30
*  @Param(array) - array - tokenized words of the entire document
*  @Return(array) - full_arr - top 30 terms found in the document and their frequency count
*/
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

/* function summary - Get the frequency of features found in each paragraph indivudually
* @Param(array) - p_array - the tokens of each paragraph
* @Param(array) - f_array - an array of features in string form.
* @Return(object) - feature_freqs - an object that contains the frequency average of each feature in each paragraph.
*/
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

/* function summary - takes in the longer array and simplfies it to a list on only names of the features.
* @Param(array) - array - the long array containing stats
* @Return(array) - the array returned only contains the names of the objects
*/
function getFeatureNameList(array) {
	let nameList = []
	for(let i = 0; i < array.length; i++) {
		nameList.push(array[i][0]);
	}
	return nameList;
}

/* function summary - gets the mean and standard deviation of the paragraph as a whole
* @Param(array) 	- f_freqs 				- feature frequency array
* @Param(array) 	- f_names 				- feature names array
* @Param(array) 	- p_array 				- tokens of each paragraph
* @Return(object) - corpus_features - the complete object containing the standard deviation and mean of each pargraph
*/
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

		/* get standard deviation using 'mean' */
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

/* function summary - get the z scores of each paragraph
* @Param(array) 	- f_freqs 				- feature frequency array
* @Param(array) 	- f_names 				- feature names array
* @Param(array) 	- p_array 				- tokens of each paragraph
* @Param(object) 	- corpus_features - the object containing mean and stdev of each paragraph
* @Return(array) -  feature_zscores - the zscores of each paragraph
*/
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

/* function summary - gets the paragraph that differs the most
* @Param(array) 	  - k_array 		- keys for each paragraph(used in draft-js as 'block' ids)
* @Param(array) 	  - f_names 		- feature names array
* @Param(array) 	  - p_array 		- tokens of each paragraph
* @Param(array)		  - z_scores		- zscores for each pargraph
* @Return(object)   - largestDiff	- returns the paragraphs that are the most differnt diction wise
*/
function getOutlier(k_array, z_scores, p_array, f_names) {

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

ipcMain.on('document-analysis', (event, arg) => {
	var array_text = arg['paragraph_array'];
	var array_key = arg['key_array'];

	/* tokens of each paragraph */
	var paragraph_text_tokens = getWordTokens(array_text);

	/* tokens of each paragraph split by sentence */
	var paragraph_sentence_tokens = getSentenceTokens(array_text);

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
		array_key,
		feature_zscores,
		paragraph_text_tokens,
		feature_names,
		corpus_features
	);

	/* calculate the sentiment of each sentence in each paragraph */
	var sentimentParagraph = getSentiment(paragraph_sentence_tokens);
	console.log(sentimentParagraph);
	/* get the pacing of each sentence in each paragraph */
	//var pacingParagraph = getPacing(paragraph_sentence_tokens);
	event.reply('document-reply', {
		"diction_stats": outlierParagraph,
		"sentiment_stats": sentimentParagraph,
		"paragraph_count": paragraph_text_tokens.length
	});
});

ipcMain.on('pacing-analysis', (event, arg) => {
	console.log(arg);
});


app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
