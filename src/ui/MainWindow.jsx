import React from 'react';
import PropTypes from 'prop-types';


export class MainWindow extends React.Component {
    constructor(props) {
        super(props);

    }

    render() {
        return <div>
            I am the main window...
        </div>;
    }
}

MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
};