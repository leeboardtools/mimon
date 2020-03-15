import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';


InfoReporter.propTypes = {
    title: PropTypes.string,
    message: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
    onClose: PropTypes.func.isRequired,
};

export function InfoReporter(props) {
    let { title, message } = props;
    let titleComponent;
    if (title) {
        titleComponent = <h5 className="pageTitle pt-3 pb-3 mb-4 border-bottom">
            {title}
        </h5>;
    }

    if (!Array.isArray(message)) {
        message = [message];
    }
    const components = [];
    for (let i = 0; i < message.length; ++i) {
        components.push(<li className="list-group-item"
            key={i}>{message[i]}</li>);
    }
    const messageComponent = <ul className="list-group">
        {components}
    </ul>;

    return <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
        {titleComponent}
        <div className="container">
            {messageComponent}
        </div>
        <div className="mt-auto">
            <div className="row border-top m-2">
                <div className="col text-right mt-2">
                    <button className="btn btn-primary"
                        onClick={props.onClose}
                    >
                        {userMsg('ok')}
                    </button>
                </div>
            </div>
        </div>
    </div>;
}