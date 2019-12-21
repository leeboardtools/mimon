import React from 'react';
import ReactDOM from 'react-dom';

const render = () => {
    const App = require('./App').default;
    ReactDOM.render(<App />, document.getElementById('App'));
};

render();
if (module.hot) {
    module.hot.accept(render);
}
