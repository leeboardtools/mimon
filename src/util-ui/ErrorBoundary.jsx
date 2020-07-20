import React from 'react';
import PropTypes from 'prop-types';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
        };
    }

    static getDerivedStateFromError(error) {
        return { 
            hasError: true, 
            error: error,
        };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Caught error: ' + error);
    }

    render() {
        if (this.state.hasError) {
            const { error } = this.state;
            const errorMsg = (error) ? error.toString() : undefined;
            return <div>
                <h1>Uh-oh....</h1>
                <div>Something went wrong )-;</div>
                <div>{errorMsg}</div>
            </div>;
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.any,
};
