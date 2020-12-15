import React from 'react';
import PropTypes from 'prop-types';
import { ModalPage } from '../util-ui/ModalPage';
import { userMsg } from '../util/UserMessages';
import { getYMDDateString, YMDDate } from '../util/YMDDate';
import { CellDateDisplay, CellDateEditor } from '../util-ui/CellDateEditor';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { Field } from '../util-ui/Field';
import { CellQuantityEditor, getValidQuantityBaseValue } 
    from '../util-ui/CellQuantityEditor';
import { getQuantityDefinitionForAccountId } from '../tools/AccountHelpers';


/**
 * React component that handles the actual transaction reconciling.
 */
export class ReconcilingWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onTransactionsAdd = this.onTransactionsAdd.bind(this);
        this.onTransactionsModify = this.onTransactionsModify.bind(this);
        this.onTransactionsRemove = this.onTransactionsRemove.bind(this);


        this.state = {

        };
    }


    componentDidMount() {
        const { accessor } = this.props;
        accessor.on('transactionsAdd', this.onTransactionsAdd);
        accessor.on('transactionsModify', this.onTransactionsModify);
        accessor.on('transactionsRemove', this.onTransactionsRemove);

        this.loadTransactions();
    }

    componentWillUnmount() {
        const { accessor } = this.props;
        accessor.off('transactionsAdd', this.onTransactionsAdd);
        accessor.off('transactionsModify', this.onTransactionsModify);
        accessor.off('transactionsRemove', this.onTransactionsRemove);
    }


    handleIfTransactionForMe(transactionDataItem) {
        const accountId = this.props.reconciler.getAccountId();
        const { splits } = transactionDataItem;
        for (let i = 0; i < splits.length; ++i) {
            if (splits[i].accountId === accountId) {
                this.loadTransactions();
                return true;
            }
        }
    }

    
    onTransactionsAdd(result) {
        const { newTransactionDataItems } = result;
        for (let i = 0; i < newTransactionDataItems.length; ++i) {
            if (this.handleIfTransactionForMe(newTransactionDataItems[i])) {
                return;
            }
        }
    }

    
    onTransactionsModify(result) {
        const { newTransactionDataItems } = result;
        for (let i = 0; i < newTransactionDataItems.length; ++i) {
            if (this.handleIfTransactionForMe(newTransactionDataItems[i])) {
                return;
            }
        }
    }


    onTransactionsRemove(result) {
        const { removedTransactionDataItems } = result;
        for (let i = 0; i < removedTransactionDataItems.length; ++i) {
            if (this.handleIfTransactionForMe(removedTransactionDataItems[i])) {
                return;
            }
        }
    }


    loadTransactions() {
        process.nextTick(async () => {
            const { reconciler } = this.props;
            const newState = {};

            newState.canApplyReconcile = await reconciler.asyncCanApplyReconcile();
            
            const splitInfos = await reconciler.asyncGetNonReconciledSplitInfos();
            splitInfos.forEach((splitInfo) => {

            });

            newState.reconciledBalanceBaseValue 
                = await reconciler.asyncGetMarkedReconciledBalanceBaseValue();

            this.setState(newState);
        });
    }


    render() {
        const { onCancel, onSetup, onReconcile, title, classExtras } = this.props;

        const doneDisabled = !this.state.canApplyReconcile;

        const buttons = [];
        if (onSetup) {
            buttons.push({
                label: userMsg('ReconcilerWindow-setup_button'),
                onClick: onSetup,
                classExtras: 'btn-secondary',
            });
        }

        let className = 'ReconcilerWindow ReconcilerWindow-reconciling';
        if (classExtras) {
            className += ' ' + classExtras;
        }
        return <ModalPage
            onDone = {onReconcile}
            doneLabel = {userMsg('ReconcilerWindow-finish_button')}
            doneDisabled = {doneDisabled}
            actionButtons = {buttons}
            onCancel = {onCancel}
            title = {title}
            classExtras = {className}
        >
        </ModalPage>;
    }
}

ReconcilingWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    reconciler: PropTypes.object.isRequired,
    lastClosingInfo: PropTypes.object.isRequired,
    closingInfo: PropTypes.object.isRequired,
    onReconcile: PropTypes.func.isRequired,
    onSetup: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
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

        const closingInfo = {
            closingBalanceBaseValue: quantityBaseValue,
            isEdited: isEdited,
            errorMsg: errorMsg,
        };
        const changes = {};
        changes[closingInfoName] = closingInfo;

        this.setState(changes);
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
                value = {getYMDDateString(lastClosingInfo.closingYMDDate)}
                dateFormat = {dateFormat}
            />;
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

        //<div className="container-fluid mt-auto mb-auto text-left">
        return <ModalPage
            onDone = {this.onDone}
            doneLabel = {userMsg('continue')}
            onCancel = {onCancel}
            title = {title}
            classExtras = {className}
        >
            <div className = "ModalPage-inner_rows_container justify-content-center">
                <div className = "row">
                    <div className = "col"></div>
                    <div className = "col">
                        {lastReconcileDate}
                    </div>
                    <div className = "col"></div>
                </div>
                <div className = "row">
                    <div className = "col"></div>
                    <div className = "col">
                        {statementClosingDate}
                    </div>
                    <div className = "col"></div>
                </div>
                <div className = "row">
                    <div className = "col"></div>
                    <div className = "col">
                        {openingBalance}
                    </div>
                    <div className = "col"></div>
                </div>
                <div className = "row">
                    <div className = "col"></div>
                    <div className = "col">
                        {closingBalance}
                    </div>
                    <div className = "col"></div>
                </div>
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


    onApplyReconcile() {
        process.nextTick(async () => {
            const { reconciler } = this.state;
            try {
                await reconciler.asyncApplyReconcile();
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
            onReconcile = {this.onApplyReconcile}
            onSetup = {this.onSetup}
            onCancel = {this.onCancelReconcile}
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
            <div className = "ModalPage-inner_rows_container justify-content-center">
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
};