## About This Project

The purpose of this project was to test an idea I had on using stylometry to help writers develop their own writing style. <br />
It was also done to learn how to develop an app using both electron and react. <br />
The analysis for diction is done using John Burrow's Delta method. <br />
Methodology is further explained below. 

## Methodology

John Burrow's Delta Method

1. Each paragraph is tokenized seperately.
2. All tokens are assemled into a full corpus. Each paragraph is considered a sub-corpus.
3. Features are determined by using getting the frequency of each word in the full corpus. Only the top 30 are kept.
4. The frequency of features in each paragraph is determined.
4. Next we calculate each paragraphs mean and standard deviation. z-scores are calculated next using these values.
5. Next we loop through each paragraph as a test case and calcualte the delta difference of each paragraph using the z-scores.
6. Finally, we save the paragraph that differs the most to that paragraph.
7. the most occuring paragraph number is the determined to be the one that does not match stylometrically.

## Libraries Used

- React
- Electron
- Natural
- Cross-Env (Global Install)
- Serve (Global Install)
 
## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br />
The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm run electron`

Runs the electron app view for the node server. <br />
Changes will be automatically refreshed and reflected in the window.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

