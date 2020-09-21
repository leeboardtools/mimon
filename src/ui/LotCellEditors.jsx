import React from 'react';
import { userMsg, userError } from '../util/UserMessages';
import * as ACE from './AccountingCellEditors';


export function getActionColumnInfo(args) {

}

export function getSharesColumnInfo(args) {

}

export function getValueColumnInfo(args) {

}

export function getFeesCommissionsColumnInfo(args) {
}

export function getPriceColumnInfo(args) {

}




/**
 * Editor renderer for share quantities.
 * @param {CellQuantityEditorArgs}  args
 */
export const renderTotalSharesEditor = ACE.renderQuantityEditor;

/**
 * Display renderer for share quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderTotalSharesDisplay = ACE.renderQuantityDisplay;


/**
 * Retrieves a column info for share totals cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalSharesColumnInfo(args) {
    return Object.assign({ key: 'shares',
        header: {
            label: userMsg('AccountingCellEditors-shares'),
            ariaLabel: 'Shares',
            classExtras: 'header-base shares-base shares-header',
        },
        inputClassExtras: 'shares-base shares-input',
        cellClassName: 'cell-base shares-base shares-cell',

        renderDisplayCell: renderTotalSharesDisplay,
        renderEditCell: renderTotalSharesEditor,
    },
    args);
}