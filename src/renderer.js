import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './ui/App';

const render = () => {
    ReactDOM.render(<App />, document.getElementById('App'));
};

render();
if (module.hot) {
    module.hot.accept(render);
}
