import React from 'react';
import PropTypes from 'prop-types';
import { ModalPage } from './ModalPage';
import { TextField } from './TextField';
import { PageBody } from '../util-ui/PageBody';

/**
 * React component that's a {@link ModalPage} with one field for entering text.
 */
export class StringPrompter extends React.Component {
    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);

        this.state = this.handleNewValue(props.initialValue);
    }


    handleNewValue(newValue) {
        const { onIsValueOK } = this.props;
        let isValueOK;
        if (onIsValueOK) {
            try {
                isValueOK = onIsValueOK(newValue);
            }
            catch (e) {
                return {
                    isValueOK: false,
                    errorMsg: e.toString(),
                };
            }
        }
        else {
            isValueOK = newValue;
        }

        return {
            value: newValue,
            isValueOK: isValueOK,
            errorMsg: undefined,
        };
    }


    onChange(e) {
        const newValue = e.target.value;
        this.setState(this.handleNewValue(newValue));
    }


    render() {
        const { props, state } = this;

        const textField = <TextField
            fieldClassExtras = "Text-left"
            ariaLabel = { props.ariaLabel }
            label = { props.label }
            value = { state.value }
            errorMsg = { state.errorMsg }
            placeholder = { props.placeholder }
            onChange = { this.onChange }
        />;

        return <ModalPage
            title = { props.title }
            doneDisabled = { !state.isValueOK }
            onDone = { () => props.onDone(state.value) }
            onCancel = { props.onCancel }
        >
            <PageBody classExtras = "Prompter-body">
                {textField}
            </PageBody>
        </ModalPage>;
    }
}

/**
 * @callback StringPrompter~onIsValueOK
 * @param {string} newValue
 * @returns {boolean} Truthy if newValue is acceptable and the Done button should
 * be enabled. Throw an Error to set an error message.
 */

/**
 * @callback StringPrompter~onDone
 * @param {string} newValue
 */

/**
 * @typedef {object} StringPrompter~propTypes
 * @property {string} [title]
 * @property {string} [ariaLabel]
 * @property {string} [label]
 * @property {string} [initialValue]
 * @property {string} [placeholder]
 * @property {StringPrompter~onIsValueOK} [onIsValueOK]
 * @property {StringPrompter~onDone} onDone
 * @property {ModalPage~onCancel} onCancel
 */
StringPrompter.propTypes = {
    title: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    initialValue: PropTypes.string,
    placeholder: PropTypes.string,
    onIsValueOK: PropTypes.func,
    onDone: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};