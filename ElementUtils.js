
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
 * @returns {Element}
 */
export function getPositionedAncestor(element) {
    const { parentElement } = element;
    if (!parentElement) {
        return element;
    }

    const style = window.getComputedStyle(parentElement);
    if (style.getPropertyValue('position') !== 'static') {
        return parentElement;
    }

    return getPositionedAncestor(parentElement);
}
