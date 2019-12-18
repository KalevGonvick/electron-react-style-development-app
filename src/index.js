/*Renderer Process*/
import './index.css';
import TextEditor from './App';
import * as serviceWorker from './serviceWorker';
import React from 'react';
import ReactDOM from 'react-dom';


ReactDOM.render(<TextEditor />, document.getElementById('root'));
serviceWorker.unregister();
