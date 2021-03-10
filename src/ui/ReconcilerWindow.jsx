import React from 'react';
import PropTypes from 'prop-types';
import { ModalPage } from '../util-ui/ModalPage';
import { userMsg } from '../util/UserMessages';
import { getYMDDateString, YMDDate } from '../util/YMDDate';
import { CellDateDisplay, CellDateEditor } from '../util-ui/CellDateEditor';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { Field } from '../util-ui/Field';
import { CellQuantityEditor, getValidQuantityBaseValue, } 
    from '../util-ui/CellQuantityEditor';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import { getQuantityDefinitionForAccountId, getCurrencyForAccountId } 
    from '../tools/AccountHelpers';
import { RowTable } from '../util-ui/RowTable';
import { ContentFramer } from '../util-ui/ContentFramer';
import * as ACE from './AccountingCellEditors';
import deepEqual from 'deep-equal';
import { Checkbox } from '../util-ui/Checkbox';
import { Row, Col } from '../util-ui/RowCols';


function getDateCellValue(args) {
    const { caller, rowEntry } = args;
    if (rowEntry) {
        return {
            ymdDate: rowEntry.ymdDate,
            accessor: caller.accessor,
        };
    }
}

function getRefNumCellValue(args) {
    const { rowEntry } = args;
    if (rowEntry) {
        return rowEntry.refNum;
    }
}

function getDescriptionCellValue(args) {
    const { rowEntry } = args;
    if (rowEntry) {
        return rowEntry.description;
    }
}

function getAmountCellValue(args) {
    const { caller, rowEntry } = args;
    if (rowEntry) {
        const { props } = caller;

        const quantityDefinition = getQuantityDefinitionForAccountId(
            props.accessor,
            props.reconciler.getAccountId());

        return {
            quantityBaseValue: rowEntry.amountBaseValue * props.signMultiplier,
            quantityDefinition: quantityDefinition,
        };
    }
}

function getReconcileCellValue(args) {
    const { rowEntry } = args;
    if (rowEntry) {
        return rowEntry.markReconciled;
    }
}


function renderReconcileCell(args) {
    const { caller, rowEntry, value } = args;
    return <Checkbox 
        value = {value}
        ariaLabel = "Reconciled"
        onChange = {(e) => caller.toggleSplitInfoReconcile(rowEntry.splitInfo)}
    />;
}


class ReconcileSplitInfosSelector extends React.Component {
    constructor(props) {
        super(props);

        this.getRowKey = this.getRowKey.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onRowDoubleClick = this.onRowDoubleClick.bind(this);

        const balanceColumnInfo = ACE.getBalanceColumnInfo({
            getCellValue: getAmountCellValue,
        });
        balanceColumnInfo.header.label = userMsg('ReconcilingWindow-amount_heading');
        balanceColumnInfo.header.ariaLabel = 'Amount';

        this.columns = [
            ACE.getDateColumnInfo({
                getCellValue: getDateCellValue,
            }),
            ACE.getRefNumColumnInfo({
                getCellValue: getRefNumCellValue,
            }),
            ACE.getDescriptionColumnInfo({
                getCellValue: getDescriptionCellValue,
            }),
            {
                key: 'reconcile',
                header: {
                    label: userMsg('ReconcilingWindow-reconcile_heading'),
                },
                cellClassExtras: 'Text-center CheckboxCell',
                getCellValue: getReconcileCellValue,
                renderDisplayCell: renderReconcileCell,
            },
            balanceColumnInfo,
        ];


        this._sizeRowEntry = {
            ymdDate: '2020-12-31',
            refNum: 1234567,
            description: 'This is a long description',
            markReconciled: true,
            amountBaseValue: ACE.BalanceSizingBaseValue,
        };

        this.state = {
            rowEntries: [],
            activeRowIndex: 0,
        };
    }


    componentDidMount() {
        this.updateRowEntries();
    }


    componentDidUpdate(prevProps, prevState) {
        if (!deepEqual(this.props.splitInfos, prevProps.splitInfos)) {
            this.updateRowEntries();
        }
    }


    updateRowEntries() {
        const newRowEntries = [];

        const { splitInfos } = this.props;
        splitInfos.forEach((splitInfo) => {
            const { transactionDataItem, splitIndex, markReconciled } = splitInfo;
            const split = transactionDataItem.splits[splitIndex];
            const rowEntry = {
                splitInfo: splitInfo,
                ymdDate: transactionDataItem.ymdDate,
                refNum: split.refNum,
                description: split.description || transactionDataItem.description,
                markReconciled: markReconciled,
                amountBaseValue: split.quantityBaseValue,
            };
            newRowEntries.push(rowEntry);
        });

        this.setState({
            rowEntries: newRowEntries,
        });
    }


    toggleSplitInfoReconcile(splitInfo) {
        process.nextTick(async () => {
            const { reconciler } = this.props;
            await reconciler.asyncSetTransactionSplitMarkedReconciled(
                splitInfo, 
                !splitInfo.markReconciled);
        });
    }


    getRowKey(rowIndex) {
        return rowIndex;
    }

    onRenderCell(args) {
        let rowEntry = (args.isSizeRender)
            ? this._sizeRowEntry
            : this.state.rowEntries[args.rowIndex];
        args = Object.assign({}, args, {
            caller: this,
            rowEntry: rowEntry,
            isActive: args.rowIndex === this.state.activeRowIndex,
        });

        const { column } = args;
        const { renderDisplayCell } = column;
        if (renderDisplayCell) {
            const value = args.column.getCellValue(args);
            return renderDisplayCell({
                caller: this,
                rowEntry: rowEntry,
                columnInfo: column,
                value: value,
            });
        }
    }

    onActivateRow(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        });
    }

    toggleActiveRowReconcile() {
        const { activeRowIndex, rowEntries } = this.state;
        if ((activeRowIndex >= 0) && (activeRowIndex < rowEntries.length)) {
            this.toggleSplitInfoReconcile(rowEntries[activeRowIndex].splitInfo);
            return true;
        }
    }

    onKeyDown(e) {
        switch (e.key) {
        case ' ' :
            if (this.toggleActiveRowReconcile()) {
                e.preventDefault();
            }
            break;
        }
    }

    onRowDoubleClick(e) {
        const { onOpenRegisterForTransactionSplit } = this.props;
        if (onOpenRegisterForTransactionSplit) {
            const { activeRowIndex, rowEntries } = this.state;
            if ((activeRowIndex >= 0) && (activeRowIndex < rowEntries.length)) {
                const { splitInfo } = rowEntries[activeRowIndex];
                const { transactionDataItem, splitIndex, } = splitInfo;
                onOpenRegisterForTransactionSplit(transactionDataItem, splitIndex);
            }
        }
    }


    render() {
        const { state } = this;
        return <div className = "RowTableContainer H-inherit ReconcileSplitInfosSelector">
            <RowTable 
                columns = {this.columns}
                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}
                onRenderCell = {this.onRenderCell}
                activeRowIndex = {state.activeRowIndex}
                onActivateRow = {this.onActivateRow}
                onKeyDown = {this.onKeyDown}
                onRowDoubleClick = {this.onRowDoubleClick}
            />
        </div>;
    }
}

ReconcileSplitInfosSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    reconciler: PropTypes.object.isRequired,
    splitInfos: PropTypes.arrayOf(PropTypes.object).isRequired,
    signMultiplier: PropTypes.number.isRequired,
    onOpenRegisterForTransactionSplit: PropTypes.func,
};


/**
 * React component that handles the actual transaction reconciling.
 */
export class ReconcilingWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onSplitInfosUpdate = this.onSplitInfosUpdate.bind(this);

        this.state = {
            inflowSplitInfos: [],
            inflowsSign: 1,
            outflowSplitInfos: [],
            outflowsSign: -1,
        };
    }


    componentDidMount() {
        const { reconciler } = this.props;
        reconciler.on('splitInfosUpdate', this.onSplitInfosUpdate);

        this.loadSplitInfos();
    }

    componentWillUnmount() {
        const { reconciler } = this.props;
        reconciler.off('splitInfosUpdate', this.onSplitInfosUpdate);
    }


    onSplitInfosUpdate() {
        this.loadSplitInfos();
    }


    loadSplitInfos() {
        process.nextTick(async () => {
            const { accessor, reconciler } = this.props;
            if (!reconciler.isReconcileStarted()) {
                // Presume we're shutting down...
                return;
            }
            
            const newState = {
                inflowSplitInfos: [],
                outflowSplitInfos: [],
            };

            newState.canApplyReconcile = await reconciler.asyncCanApplyReconcile();

            const accountId = reconciler.getAccountId();
            const category = accessor.getCategoryOfAccountId(accountId);
            const outflowsSign = category.creditSign;
            newState.outflowsSign = outflowsSign;
            newState.inflowsSign = -outflowsSign;
            
            const splitInfos = await reconciler.asyncGetNonReconciledSplitInfos();
            const transactionDataItemsById = new Map();
            splitInfos.forEach((splitInfo) => {
                transactionDataItemsById.set(splitInfo.transactionId, undefined);
            });

            const transactionIds = Array.from(transactionDataItemsById.keys());
            const transactionDataItems 
                = await accessor.asyncGetTransactionDataItemsWithIds(
                    transactionIds);
            transactionDataItems.forEach((transactionDataItem) => {
                transactionDataItemsById.set(transactionDataItem.id, transactionDataItem);
            });

            splitInfos.forEach((splitInfo) => {
                const transactionDataItem 
                    = transactionDataItemsById.get(splitInfo.transactionId);
                const split = transactionDataItem.splits[splitInfo.splitIndex];

                splitInfo = Object.assign({}, splitInfo);
                splitInfo.transactionDataItem = transactionDataItem;
                if (split.quantityBaseValue * outflowsSign > 0) {
                    newState.outflowSplitInfos.push(splitInfo);
                }
                else {
                    newState.inflowSplitInfos.push(splitInfo);
                }
            });

            newState.reconciledBalanceBaseValue 
                = await reconciler.asyncGetMarkedReconciledBalanceBaseValue();

            this.setState(newState);
        });
    }


    onSelectAllNone(splitInfos, markReconciled) {
        process.nextTick(async () => {
            const { reconciler } = this.props;
            await reconciler.asyncSetTransactionSplitMarkedReconciled(
                splitInfos, markReconciled);
        });
    }


    renderSplitInfos(titleId, splitInfos, signMultiplier) {
        const { accessor, reconciler } = this.props;

        const title = <div className = "ReconcilingWindow-splitInfos-title">
            {userMsg(titleId)}
        </div>;

        const splitInfosSelector = <ReconcileSplitInfosSelector
            accessor = {accessor}
            reconciler = {reconciler}
            splitInfos = {splitInfos}
            signMultiplier = {signMultiplier}
            onOpenRegisterForTransactionSplit 
                = {this.props.onOpenRegisterForTransactionSplit}
        />;

        let reconciledBaseValue = 0;
        splitInfos.forEach((splitInfo) => {
            if (splitInfo.markReconciled) {
                const { transactionDataItem, splitIndex } = splitInfo;
                reconciledBaseValue 
                    += transactionDataItem.splits[splitIndex].quantityBaseValue;
            }
        });
        reconciledBaseValue *= signMultiplier;


        const selectAll = <button type = "button"
            className = "btn btn-outline-secondary btn-sm mr-1"
            onClick = {() => this.onSelectAllNone(splitInfos, true)}
        >
            {userMsg('ReconcilingWindow-selectAll_button')}
        </button>;
        const clearAll = <button type = "button"
            className = "btn btn-outline-secondary btn-sm ml-1"
            onClick = {() => this.onSelectAllNone(splitInfos, false)}
        >
            {userMsg('ReconcilingWindow-clearAll_button')}
        </button>;

        const currency = getCurrencyForAccountId(
            accessor,
            reconciler.getAccountId());

        const label = userMsg('ReconcilingWindow-total_label');
        const total = this.renderSummaryRow('ReconcilingWindow-total_label',
            <CellTextDisplay
                ariaLabel = {label}
                value = {currency.baseValueToString(reconciledBaseValue)}
                inputClassExtras = "ReconcilingWindow-splitInfoTotal_value"
            />);
        const totalRow = <div className = "ReconcilingWindow-splitInfos-total">
            <Row classExtras = "Row-justify-content-between">
                <Col>
                    {selectAll}
                    {clearAll}
                </Col>
                <Col>
                    {total}
                </Col>
            </Row>
        </div>;

        return <ContentFramer 
            classExtras = "RowTableContainer ReconcilingWindow-splitInfos"
            onRenderHeader = {() => title}
            onRenderContent = {() => splitInfosSelector}
            onRenderFooter = {() => totalRow}
        />;
    }


    renderInflows() {
        return this.renderSplitInfos('ReconcilingWindow-inflow_title',
            this.state.inflowSplitInfos,
            this.state.inflowsSign,
        );
    }


    renderOutflows() {
        return this.renderSplitInfos('ReconcilingWindow-outflow_title',
            this.state.outflowSplitInfos,
            this.state.outflowsSign,
        );
    }


    renderSummaryRow(labelId, valueComponent) {
        return <Row classExtras = "ReconcilingWindow-summary_row">
            <Col classExtras = "ReconcilingWindow-summary_label">
                {userMsg(labelId)}
            </Col>
            <Col classExtras = "ReconcilingWindow-summary_value">
                {valueComponent}
            </Col>
        </Row>;
    }

    renderSummaryValueRow(labelId, valueBaseValue) {
        const { accessor, reconciler } = this.props;
        
        const currency = getCurrencyForAccountId(
            accessor,
            reconciler.getAccountId());

        const label = userMsg(labelId);
        const component = <CellTextDisplay
            ariaLabel = {label}
            value = {currency.baseValueToString(valueBaseValue)}
            inputClassExtras = "ReconcilingWindow-summary_value"
        />;
        return this.renderSummaryRow(labelId, component);
    }

    renderSummary() {
        const { reconciledBalanceBaseValue } = this.state;
        if (reconciledBalanceBaseValue === undefined) {
            return;
        }

        const { accessor, lastClosingInfo, closingInfo, } = this.props;
        const dateFormat = accessor.getDateFormat();
        const dateComponent = <CellDateDisplay
            value = {getYMDDateString(closingInfo.closingYMDDate)}
            dateFormat = {dateFormat}
            inputClassExtras = "ReconcilingWindow-summary_date"
        />;

        return <div className = "ReconcilingWindow-summary">
            {this.renderSummaryRow('ReconcilerWindow-statementEndDate_label', 
                dateComponent)}
            {this.renderSummaryValueRow('ReconcilerWindow-openingBalance_label',
                lastClosingInfo.closingBalanceBaseValue)}
            {this.renderSummaryValueRow('ReconcilerWindow-closingBalance_label',
                closingInfo.closingBalanceBaseValue)}
            {this.renderSummaryValueRow('ReconcilingWindow-reconciledBalance_label',
                reconciledBalanceBaseValue)}
            {this.renderSummaryValueRow('ReconcilingWindow-difference_label',
                reconciledBalanceBaseValue - closingInfo.closingBalanceBaseValue)}
        </div>;
    }
    

    render() {
        const { onCancel, onSetup, onFinishLater, onReconcile, title, 
            classExtras, reconciler } = this.props;
        
        if (!reconciler.isReconcileStarted()) {
            return null;
        }

        const doneDisabled = !this.state.canApplyReconcile;

        const buttons = [];
        if (onSetup) {
            buttons.push({
                label: userMsg('ReconcilerWindow-setup_button'),
                onClick: onSetup,
                classExtras: 'btn-secondary',
            });
        }

        if (onFinishLater) {
            buttons.push({
                label: userMsg('ReconcilerWindow-finish_later_button'),
                onClick: onFinishLater,
                classExtras: 'btn-secondary',
            });
        }


        const inflows = this.renderInflows();
        const outflows = this.renderOutflows();
        const summary = this.renderSummary();

        let className = 'ReconcilerWindow ReconcilerWindow-reconciling';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        const splitInfosContainer = <div 
            className = "ReconcilingWindow-splitInfosContainer"
        >
            <Row classExtras = "H-inherit">
                <Col classExtras = "H-inherit w-50 pr-1">
                    {inflows}
                </Col>
                <Col classExtras = "H-inherit w-50 pl-1">
                    {outflows}
                </Col>
            </Row>
        </div>;


        const summaryContainer = <div className = "ReconcilingWindow-summaryContainer">
            {summary}
        </div>;


        return <ModalPage
            onDone = {onReconcile}
            doneLabel = {userMsg('ReconcilerWindow-finish_button')}
            doneDisabled = {doneDisabled}
            actionButtons = {buttons}
            onCancel = {onCancel}
            title = {title}
            classExtras = {className}
        >
            <ContentFramer
                onRenderContent = {() => splitInfosContainer}
                onRenderFooter = {() => summaryContainer}
            />
        </ModalPage>;
    }
}

ReconcilingWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    reconciler: PropTypes.object.isRequired,
    lastClosingInfo: PropTypes.object.isRequired,
    closingInfo: PropTypes.object.isRequired,
    onReconcile: PropTypes.func.isRequired,
    onFinishLater: PropTypes.func.isRequired,
    onSetup: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    onOpenRegisterForTransactionSplit: PropTypes.func,
    title: PropTypes.string,
    classExtras: PropTypes.string,
};


/**
 * React component for setting up a reconciliation's balances.
 */
export class ReconcilerSetupWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onDone = this.onDone.bind(this);

        const { lastClosingInfo, closingInfo } = this.props;
        this.state = {
            lastClosingInfo: Object.assign({}, lastClosingInfo),
            closingInfo: Object.assign({}, closingInfo),
        };
        if (this.state.lastClosingInfo.closingBalanceBaseValue === undefined) {
            this.state.lastClosingInfo.closingBalanceBaseValue = 0;
        }
    }


    onDone() {
        const { onApplySetup } = this.props;
        const { lastClosingInfo, closingInfo } = this.state;

        onApplySetup(closingInfo, lastClosingInfo);
    }


    getAccountDataItem() {
        const { accessor, reconciler } = this.props;
        return accessor.getAccountDataItemWithId(reconciler.getAccountId());
    }


    onClosingDateChange(ymdDate) {
        this.setState((state) => {
            const closingInfo = Object.assign({}, state.closingInfo, {
                closingYMDDate: ymdDate,
            });

            return {
                closingInfo: closingInfo,
            };
        },
        () => {
            if (!this.state.closingInfo.isEdited) {
                process.nextTick(async () => {
                    const { reconciler } = this.props;
                    const newClosingInfo = await reconciler.asyncEstimateNextClosingInfo(
                        ymdDate
                    );
                    this.setState({
                        closingInfo: newClosingInfo,
                    });
                });
            }
        });
    }


    renderStatementClosingDateEditor(className) {
        const { accessor } = this.props;
        const { closingInfo } = this.state;
        const { closingYMDDate } = closingInfo;

        return <CellDateEditor
            ariaLabel = {userMsg('ReconcilerWindow-statementEndDate_label')}
            value = {getYMDDateString(closingYMDDate || new YMDDate())}
            inputClassExtras = {className}
            onChange = {(e) => this.onClosingDateChange(e)}
            dateFormat = {accessor.getDateFormat()}
            tabIndex = {0}
        />;
    }



    onBalanceEditorChange(e, closingInfoName) {
        const { accessor, reconciler } = this.props;
        const quantityDefinition = getQuantityDefinitionForAccountId(
            accessor,
            reconciler.getAccountId());

        let quantityBaseValue = e.target.value.trim();
        let errorMsg = undefined;
        let { isEdited } = this.state[closingInfoName];
        try {
            quantityBaseValue = getValidQuantityBaseValue(
                quantityBaseValue,
                quantityDefinition
            );
            isEdited = true;
        }
        catch (e) {
            errorMsg = e.toString();
        }

        this.setState((state) => {
            const closingInfo = Object.assign({},
                state[closingInfoName],
                {
                    closingBalanceBaseValue: quantityBaseValue,
                    isEdited: isEdited,
                    errorMsg: errorMsg,
                });
            const changes = {};
            changes[closingInfoName] = closingInfo;
            return changes;
        });
    }

    renderBalanceEditor(className, closingInfoName, ariaLabel) {
        const closingInfo = this.state[closingInfoName];

        const { accessor, reconciler } = this.props;
        const quantityDefinition = getQuantityDefinitionForAccountId(
            accessor,
            reconciler.getAccountId());

        return <CellQuantityEditor
            ariaLabel = {ariaLabel}
            value = {closingInfo.closingBalanceBaseValue}
            quantityDefinition = {quantityDefinition}
            inputClassExtras = {className}
            onChange = {(e) => this.onBalanceEditorChange(e, closingInfoName)}
            errorMsg = {closingInfo.errorMsg}
        />;
    }

    renderClosingInfoBalance(closingInfoName, labelId) {
        const { reconciler } = this.props;
        const accountId = reconciler.getAccountId();

        const label = userMsg(labelId);
        return <Field
            id = {'ReconcilerWindow_' + accountId + '_' + closingInfoName
                + '_balanceEditor'}
            label = {label}
            onRenderEditor = {(className) => 
                this.renderBalanceEditor(className, closingInfoName, label)}
            editorClassExtras = "ReconcilerWindow-setup_balance_editor"
        />;
    }


    render() {
        const { title, classExtras, onCancel } = this.props;

        const { accessor, reconciler } = this.props;
        const dateFormat = accessor.getDateFormat();

        const accountId = reconciler.getAccountId();

        const { lastClosingInfo } = this.state;

        // Last reconcile date
        let lastReconcileDate;
        if (lastClosingInfo.closingYMDDate) {
            lastReconcileDate = <CellDateDisplay
                inputClassExtras = "ReconcilerWindow-setup_date_editor"
                value = {getYMDDateString(lastClosingInfo.closingYMDDate)}
                dateFormat = {dateFormat}
            />;
            lastReconcileDate = <Field
                id = {'ReconcilerWindow_' + accountId + '_lastReconcileDate'}
                label = {userMsg('ReconcilerWindow-lastReconcileDate_label')}
            >
                {lastReconcileDate}
            </Field>;
        }

        // Statement closing date
        let statementClosingDate = <Field
            id = {'ReconcilerWindow_' + accountId + '_statementClosingDate'}
            label = {userMsg('ReconcilerWindow-statementEndDate_label')}
            onRenderEditor = {(className) => 
                this.renderStatementClosingDateEditor(className)}
            editorClassExtras = "ReconcilerWindow-setup_date_editor"
        />;

        // Opening balance
        let openingBalance = this.renderClosingInfoBalance('lastClosingInfo', 
            'ReconcilerWindow-openingBalance_label');
        
        // Closing balance        
        let closingBalance = this.renderClosingInfoBalance('closingInfo', 
            'ReconcilerWindow-closingBalance_label');

        
        let className = 'ReconcilerWindow ReconcilerWindow-setup';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <ModalPage
            onDone = {this.onDone}
            doneLabel = {userMsg('continue')}
            onCancel = {onCancel}
            title = {title}
            classExtras = {className}
        >
            <div className = "ModalPage-inner_rows_container Row-justify-content-center">
                <Row>
                    <Col></Col>
                    <Col>
                        {lastReconcileDate}
                    </Col>
                    <Col></Col>
                </Row>
                <Row>
                    <Col></Col>
                    <Col>
                        {statementClosingDate}
                    </Col>
                    <Col></Col>
                </Row>
                <Row>
                    <Col></Col>
                    <Col>
                        {openingBalance}
                    </Col>
                    <Col></Col>
                </Row>
                <Row>
                    <Col></Col>
                    <Col>
                        {closingBalance}
                    </Col>
                    <Col></Col>
                </Row>
            </div>
        </ModalPage>;
    }
}

ReconcilerSetupWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    reconciler: PropTypes.object.isRequired,
    lastClosingInfo: PropTypes.object.isRequired,
    closingInfo: PropTypes.object.isRequired,
    onApplySetup: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    title: PropTypes.string,
    classExtras: PropTypes.string,
};


/**
 * React component for the reconcile window.
 */
export class ReconcilerWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onSetup = this.onSetup.bind(this);
        this.onApplySetup = this.onApplySetup.bind(this);
        this.onCancelSetup = this.onCancelSetup.bind(this);

        this.onApplyReconcile = this.onApplyReconcile.bind(this);
        this.onCancelReconcile = this.onCancelReconcile.bind(this);

        this.state = {
            mode: 'startup',
        };
    }


    componentDidMount() {
        process.nextTick(async () => {
            try {
                const { accessor, accountId } = this.props;
                const reconciler = await accessor.asyncGetAccountReconciler(
                    accountId,
                );

                const lastClosingInfo = reconciler.getLastClosingInfo();
                const closingInfo = await reconciler.asyncEstimateNextClosingInfo();
                if (!closingInfo || !closingInfo.closingYMDDate) {
                    // There's nothing to reconcile.
                    this.setState({
                        mode: 'noTransactions',
                    });
                }
                else {
                    this.setState({
                        reconciler: reconciler,
                        lastClosingInfo: lastClosingInfo,
                        closingInfo: closingInfo,

                        mode: 'setup',
                    });
                }
            }
            catch (e) {
                this.setState({
                    mode: 'loadError',
                    errorMsg: e.toString(),
                });
            }
        });
    }


    componentWillUnmount() {
        const { reconciler } = this.state;
        if (reconciler) {
            reconciler.cancelReconcile();
        }

        this.setState({
            reconciler: undefined,
        });
    }


    onSetup() {
        this.setState({
            mode: 'setup',
        });
    }


    onApplySetup(closingInfo, lastClosingInfo) {
        this.setState({
            closingInfo: closingInfo,
            lastClosingInfo: lastClosingInfo,
            mode: 'loading',
        },
        () => {
            process.nextTick(async () => {
                try {
                    const { reconciler, closingInfo } = this.state;
                    await reconciler.asyncStartReconcile(closingInfo.closingYMDDate,
                        closingInfo.closingBalanceBaseValue);
                    this.setState({
                        mode: 'reconciling',
                        isReconcileActive: true,
                    });
                }
                catch (e) {
                    this.setState({
                        mode: 'loadError',
                        errorMsg: e.toString(),
                    });
                }
            });
        });
    }


    onCancelSetup() {
        const { isReconcileActive } = this.state;
        if (isReconcileActive) {
            this.setState({
                mode: 'reconciling'
            });
        }
        else {
            this.props.onClose();
        }
    }


    onApplyReconcile(applyPending) {
        process.nextTick(async () => {
            const { reconciler } = this.state;
            try {
                await reconciler.asyncApplyReconcile(applyPending);
                this.props.onClose();
            }
            catch (e) {
                this.setState({
                    mode: 'reconcileError',
                    errorMsg: e.toString(),
                });
            }
        });
    }


    onCancelReconcile() {
        this.props.onClose();
    }


    getAccountDataItem() {
        const { accessor, accountId } = this.props;
        return accessor.getAccountDataItemWithId(
            accountId);
    }


    getTitle(msgId) {
        const accountDataItem = this.getAccountDataItem();
        return userMsg(msgId, accountDataItem.name);
    }


    renderSetup() {
        const { accessor, } = this.props;
        const { reconciler, lastClosingInfo, closingInfo } = this.state;
        return <ReconcilerSetupWindow
            accessor = {accessor}
            reconciler = {reconciler}
            lastClosingInfo = {lastClosingInfo}
            closingInfo = {closingInfo}
            onApplySetup = {this.onApplySetup}
            onCancel = {this.onCancelSetup}
            title = {this.getTitle('ReconcilerWindow-setup_title')}
        />;
    }


    renderReconciling() {
        const { accessor, } = this.props;
        const { reconciler, lastClosingInfo, closingInfo } = this.state;
        return <ReconcilingWindow
            accessor = {accessor}
            reconciler = {reconciler}
            lastClosingInfo = {lastClosingInfo}
            closingInfo = {closingInfo}
            onReconcile = {() => this.onApplyReconcile()}
            onFinishLater = {() => this.onApplyReconcile(true)}
            onSetup = {this.onSetup}
            onCancel = {this.onCancelReconcile}
            onOpenRegisterForTransactionSplit 
                = {this.props.onOpenRegisterForTransactionSplit}
            title = {this.getTitle('ReconcilerWindow-reconciling_title')}
        />;
    }


    renderLoading() {
        return <div className = "ReconcilerWindow ReconcilerWindow-loading">
            {this.getTitle('ReconcilerWindow-loading_title')}
        </div>;
    }


    renderNoTransactions() {
        return <ModalPage
            onCancel = {this.onCancelReconcile}
            title = {this.getTitle('ReconcilerWindow-reconciling_title')}
            classExtras = "ReconcilerWindow ReconcilerWindow-reconciling"
        >
            <div className = "ModalPage-inner_rows_container Row-justify-content-center">
                {userMsg('ReconcilerWindow-noTransactions')}
            </div>
        </ModalPage>;
    }

    renderLoadError() {
        return <ErrorReporter message = {this.state.errorMsg}
            onClose = {this.props.onClose}
        />;
    }


    render() {
        const { mode } = this.state;

        switch (mode) {
        case 'startup' :
        case 'loading' :
            return this.renderLoading();

        case 'setup' :
            return this.renderSetup();
        
        case 'reconciling' :
            return this.renderReconciling();
        
        case 'noTransactions' :
            return this.renderNoTransactions();
        
        case 'loadError' :
        case 'reconcileError' :
            return this.renderLoadError();
        }
    }
}

ReconcilerWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    accountId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,    
    onOpenRegisterForTransactionSplit: PropTypes.func,
};