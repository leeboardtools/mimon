import 'core-js/stable';
import 'regenerator-runtime/runtime';
import './util-ui/util-ui.css';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './ui/App';

const render = () => {
    ReactDOM.render(<App />, document.getElementById('App'));
};

console.log('renderer');
render();
if (module.hot) {
    module.hot.accept(render);
}
console.log('end-renderer');