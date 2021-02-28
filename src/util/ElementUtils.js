
/**
 * Returns <code>true</code> if child is a child element of parent.
 * @param {Element} parent 
 * @param {Element} child 
 * @returns {boolean}
 */
export function isElementAncestor(parent, child) {
    if (parent && child) {
        while (child.parentElement) {
            if (child.parentElement === parent) {
                return true;
            }
            child = child.parentElement;
        }
    }
}


/**
 * Attempts to set focus to an element via a focus() method on the element.
 * @param {Element} element 
 * @returns {boolean}   <code>true</code> if element was defined and had a function
 * called 'focus()'.
 */
export function setFocus(element) {
    if (element) {
        if (typeof element.focus === 'function') {
            element.focus();
            return true;
        }
    }
}


/**
 * Retrieves the first ancestor of an element that is positioned, whose 
 * position style is not 'static'.
 * @param {Element} element 
 * @param {Element[]} [elementChain] If specified an array onto which each
 * parent element is pushed. The initial element is not pushed.
 * @returns {Element}
 */
export function getPositionedAncestor(element, elementChain) {
    const { parentElement } = element;
    if (!parentElement) {
        return element;
    }
    if (elementChain) {
        elementChain.push(parentElement);
    }

    const style = window.getComputedStyle(parentElement);
    if (style.getPropertyValue('position') !== 'static') {
        return parentElement;
    }

    return getPositionedAncestor(parentElement, elementChain);
}


/**
 * @typedef {object} getParentClipBoundsResult
 * @property {number} left
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 */

/**
 * Walks up the ancestors of an element to determine where the element will
 * be clipped, currently presumes the element will be positioned absolutely.
 * @param {Element} element 
 * @returns {getParentClipBoundsResult}
 */
export function getParentClipBounds(element) {
    let parentElement = element.parentElement;
    let isOverflowX;
    let isOverflowY;

    const { clientWidth, clientHeight } = document.documentElement;
    let minLeft = 0;
    let minTop = 0;
    let maxRight = clientWidth;
    let maxBottom = clientHeight;

    while (parentElement) {
        const style = window.getComputedStyle(parentElement);
        let overflow = style.getPropertyValue('overflow-y');
        if (overflow === 'auto') {
            if (parentElement.clientHeight < parentElement.scrollHeight) {
                overflow = 'scroll';
            }
        }
        if (overflow === 'scroll') {
            const rect = parentElement.getBoundingClientRect();
            minLeft = rect.left;
            minTop = rect.top;
            maxRight = rect.left + parentElement.clientWidth;
            maxBottom = rect.top + parentElement.clientHeight;
            isOverflowY = true;
        }

        overflow = style.getPropertyValue('overflow-x');
        if (overflow === 'auto') {
            if (parentElement.clientWidth < parentElement.scrollWidth) {
                overflow = 'scroll';
            }
        }
        if (overflow === 'scroll') {
            const rect = parentElement.getBoundingClientRect();
            minTop = rect.top;
            maxBottom = rect.top + parentElement.clientHeight;
            isOverflowX = true;
        }

        if (isOverflowX && isOverflowY) {
            break;
        }

        parentElement = parentElement.parentElement;
    }

    return {
        left: minLeft,
        top: minTop,
        right: maxRight,
        bottom: maxBottom,
    };
}