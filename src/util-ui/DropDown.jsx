import React from 'react';
import PropTypes from 'prop-types';


export function DropDown(props) {
    const itemClassExtras = props.itemClassExtras || '';

    let dividerCount = 0;
    const items = props.items.map((item) => {
        if (!item.id) {
            ++dividerCount;
            return <div className="dropdown-divider" key={dividerCount}></div>;
        }

        let className = 'dropdown-item ' + itemClassExtras;
        if (item.classExtras) {
            className += ' ' + item.classExtras;
        }

        let onClick;
        if (item.disabled) {
            className += ' disabled';
        }
        else {
            onClick = (item.onClick) 
                ? item.onClick
                : () => props.onChooseItem(item.id);
        }

        let itemComponent;
        if (item.onRender) {
            itemComponent = item.onRender(item);
        }
        else {
            itemComponent = item.label;
        }

        return <a className={className}
            key={item.id}
            href="#"
            onClick={onClick}
        >
            {itemComponent}
        </a>;
    });


    let topClassName = 'dropdown';
    const { topClassExtras } = props;
    if (topClassExtras) {
        topClassName += ' ' + topClassExtras;
    }
    
    let buttonClassName = (props.noArrow) ? '' : 'dropdown-toggle ';
    const { buttonClassExtras } = props;
    if (buttonClassExtras) {
        buttonClassName += ' ' + buttonClassExtras;
    }

    let menuClassName = 'dropdown-menu ';
    const { menuClassExtras } = props;
    if (menuClassExtras) {
        menuClassName += ' ' + menuClassExtras;
    }

    return <div className={topClassName}>
        <a className={buttonClassName}
            data-toggle="dropdown"
            href="#"
            role="button"
            aria-label={props.ariaLabel}
            aria-haspopup="true"
            aria-expanded="false"
            disabled={props.disabled}
        >
            {props.title}
        </a>
        <div className={menuClassName}>
            {items}
        </div>
    </div>;
}

DropDown.propTypes = {
    title: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]).isRequired,
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    items: PropTypes.array.isRequired,
    disabled: PropTypes.bool,
    topClassExtras: PropTypes.string,
    noArrow: PropTypes.bool,
    buttonClassExtras: PropTypes.string,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
};
