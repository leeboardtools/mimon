import React from 'react';
import PropTypes from 'prop-types';


CellSelectEditor.propTypes = {
    selectedValue: PropTypes.string,
    options: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.array),
    ]).isRequired,
    errorMsg: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
};

export function CellSelectEditor(props) {
    const { selectedValue, options, errorMsg, ariaLabel, classExtras, 
        onChange, disabled } = props;

    const divClassName = 'input-group mb-0 ';
    let className = 'form-control cellSelectEditor-select ' + classExtras;

    let optionComponents;
    if (options.length && (typeof options[0] === 'string')) {
        optionComponents = options.map((option) =>
            <option key={option}>{option}</option>);
    }
    else {
        optionComponents = options.map(([key, option]) =>
            <option key={key} value={key}>{option}</option>);
    }

    let errorMsgComponent;
    if (errorMsg) {
        className += ' is-invalid';
        errorMsgComponent = <div className="invalid-feedback">
            {errorMsg}
        </div>;
    }
    return <div className={divClassName}>
        <select
            className={className}
            aria-label={ariaLabel}
            value={selectedValue}
            disabled={disabled}
            onChange={onChange}
        >
            {optionComponents}
        </select>
        {errorMsgComponent}
    </div>;
}


CellSelectDisplay.propTypes = {
    selectedValue: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
};

export function CellSelectDisplay(props) {
    const { selectedValue, ariaLabel, classExtras, } = props;

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + classExtras;

    return <div className={divClassName}>
        <input type="text"
            className={className}
            aria-label={ariaLabel}
            style={{backgroundColor: 'inherit'}}
            disabled
            value={selectedValue || ''}
            onChange={() => {}}
        />
    </div>;
}
