import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { PageTitle } from './PageTitle';


/**
 * @typedef {object} ProgressReporter~Entry
 * @property {string} message,
 * @property {number} [currentCount]
 * @property {number} [totalCount]
 * @property {*} [key]
 */


/**
 * @callback ProgressReporter~onCancel
 */


/**
 * @typedef {object} ProgressReporter~propTypes
 * @property {string}   [title] Optional title.
 * @property {string|string[]|ProgressReporter~Entry|ProgressReporter~Entry[]}
 *  progress
 * @property {ProgressReporter~onCancel}    onCancel Called when the cancel button
 * is chosen, no cancel button is displayed if this is not defined.
 */
ProgressReporter.propTypes = {
    progress: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
        PropTypes.arrayOf(PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string,
        ])),
    ]),
    title: PropTypes.string,
    onCancel: PropTypes.func,
};


/**
 * React component for reporting progress.
 * @name ProgressReporter
 * @class
 */
export function ProgressReporter(props) {
    let { title, progress, onCancel, } = props;

    let titleComponent;
    if (title) {
        titleComponent = <PageTitle>
            {title}
        </PageTitle>;
    }

    let entries;
    if (progress) {
        if (!Array.isArray(progress)) {
            progress = [ progress ];
        }

        entries = progress.map((item) => {
            if (typeof item === 'string') {
                return {
                    message: item,
                };
            }
            return item;
        });
    }

    const entryComponents = [];
    if (entries) {
        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            const component = <div key = {entry.key || i}>
                {entry.message}
            </div>;
            entryComponents.push(component);
        }
    }

    let cancelComponent;
    if (onCancel) {
        // 
        cancelComponent = <div className="mt-auto">
            <div className="row border-top m-2">
                <div className="col text-right mt-2">
                    <button className="btn btn-primary"
                        onClick={onCancel}
                    >
                        {userMsg('cancel')}
                    </button>
                </div>
            </div>
        </div>;
    }

    return <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
        {titleComponent}
        <div className="container">
            {entryComponents}
        </div>
        {cancelComponent}
    </div>;
}
