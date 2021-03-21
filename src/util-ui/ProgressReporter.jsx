import React from 'react';
import PropTypes from 'prop-types';
import { PageBody } from './PageBody';
import { ModalPage } from './ModalPage';


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
 * @property {boolean} [cancelDisabled]
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
    cancelDisabled: PropTypes.bool,
};


/**
 * React component for reporting progress.
 * @name ProgressReporter
 * @class
 */
export function ProgressReporter(props) {
    let { title, progress, onCancel, } = props;

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

    return <ModalPage
        title = {title}
        onCancel = {onCancel}
        cancelDisabled = {props.cancelDisabled}
    >
        <PageBody classExtras = "Text-center ProgressReporter-body">
            {entryComponents}
        </PageBody>
    </ModalPage>;
}
