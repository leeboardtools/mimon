import React from 'react';
import PropTypes from 'prop-types';


/**
 * React component for a field, it packages together a label around the child
 * component that handles the actual editing. It also supports an error message
 * below the child component.
 * @class
 */
export function Field(props) {
    const { label, id, errorMsg, fieldClassExtras,
        editorClassExtras, onRenderEditor } = props;

    let divClassName = 'form-group';
    if (fieldClassExtras) {
        divClassName = divClassName + ' ' + fieldClassExtras;
    }
    
    let labelComponent;
    if (label) {
        labelComponent = <label htmlFor={id}>{label}</label>;
    }

    let editorClassName = 'form-control ' + (editorClassExtras || '');

    let errorMsgComponent;
    if (errorMsg) {
        editorClassName += ' is-invalid';
        errorMsgComponent = <div className="invalid-feedback">
            {errorMsg}
        </div>;
    }

    let prepend;
    if (props.prependComponent) {
        prepend = <div className="input-group-prepend">
            {props.prependComponent}
        </div>;
    }

    let append;
    if (props.appendComponent) {
        append = <div className="input-group-append">
            {props.appendComponent}
        </div>;
    }

    if (prepend || append) {
        editorClassName += ' field-input-form-control';
    }

    let inputComponent = onRenderEditor(editorClassName);
    if (prepend || append) {
        let inputClassName = 'input-group';
        if (errorMsg) {
            inputClassName += ' is-invalid';
        }
        inputComponent = <div className={inputClassName}>
            {prepend}
            {inputComponent}
            {append}
        </div>;
    }

    return <div className={divClassName}>
        {labelComponent}
        {inputComponent}
        {errorMsgComponent}
    </div>;
}


/**
 * @callback {Field~onRenderEditor}
 * @param {string}  className
 */


/**
 * @typedef {object} Field~propTypes
 * @property {string}   [id]
 * @property {string}   [label]
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {string}   [fieldClassExtras] If specified additional CSS
 * classes to add to the outer field container.
 * @property {string}   [editorClassExtras]  If specified additional CSS
 * classes to add to the editor entity.
 * @property {Field~onRenderEditor} onRenderEditor  Callback for rendering the
 * editor component. We use a callback so we can pass in a modified editorClassName
 * if there's an error message.
 * @property {object} [prependComponent] Optional component to appear before
 * the editor.
 * @property {object} [appendComponent] Optional component to appear after the editor.
 */
Field.propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    errorMsg: PropTypes.string,
    fieldClassExtras: PropTypes.string,
    editorClassExtras: PropTypes.string,
    onRenderEditor: PropTypes.func.isRequired,
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};


export function FieldPrefix(props) {
    if (!props.children) {
        return null;
    }
    return <div className = "col-form-label pr-2">
        {props.children}
    </div>;
}

FieldPrefix.propTypes = {
    children: PropTypes.any,
};


export function FieldSuffix(props) {
    if (!props.children) {
        return null;
    }
    return <div className = "col-form-label pl-2">
        {props.children}
    </div>;
}

FieldSuffix.propTypes = {
    children: PropTypes.any,
};
