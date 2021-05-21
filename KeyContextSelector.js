

/**
 * Utility for selecting something based on a sequence of key presses. This maintains
 * the sequence of keys pressed for a short period of time, then resets it if no keys
 * are pressed after the timeout.
 * <p>
 * {@link KeysContextSelector#onKeyDown} should be passed to a key down event handler
 * to process keys.
 * <p>
 * Loosely based on  
 * {@link https://www.w3.org/TR/wai-aria-practices/examples/listbox/js/listbox.js}.
 */
export class KeysContextSelector {
    /**
     * Called from {@link KeysContextSelector#onKeyDown} when keys are pressed.
     * @callback KeysContextSelector~onSelectFromKeysCallback
     * @param {string} keysSoFar
     * @param {Event} event
     */

    /**
     * @typedef {object} KeysContextSelector~options
     * @property {KeysContextSelector~onSelectFromKeysCallback} onSelectFromKeys
     * @property {number} [clearDelayMS=500]
     */
    constructor(props) {
        props = props || {};

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyClearTimeout = this.onKeyClearTimeout.bind(this);

        this.onSelectFromKeys = props.onSelectFromKeys;
        this.clearDelayMS = props.clearDelayMS || 500;
        this.keysSoFar = '';
    }


    /**
     * Call this from a key down event handler, it will call the
     * {@link KeysContextSelector~onSelectFromKeysCallback} with the current sequence
     * of keys.
     * @param {Event} e 
     * @returns {*} The result of the {@link KeysContextSelector~onSelectFromKeysCallback}
     */
    onKeyDown(e) {
        const char = e.key;
        if (!char || (char.length !== 1)) {
            // Ignore special keys...
            return;
        }

        this.keysSoFar += char.toUpperCase();
        this.clearKeysSoFarAfterDelay();

        if (this.onSelectFromKeys) {
            return this.onSelectFromKeys(this.keysSoFar, e);
        }
    }


    onKeyClearTimeout() {
        this.keysSoFar = '';
        this.keyClearTimeoutId = null;
    }


    clearKeysSoFarAfterDelay() {
        if (this.keyClearTimeoutId) {
            clearTimeout(this.keyClearTimeoutId);
            this.keyClearTimeoutId = null;
        }

        this.keyClearTimeoutId = setTimeout(this.onKeyClearTimeout, this.clearDelayMS);
    }
}
