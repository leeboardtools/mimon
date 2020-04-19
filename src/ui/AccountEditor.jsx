import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { SequentialPages } from '../util-ui/SequentialPages';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TextField } from '../util-ui/TextField';
import deepEqual from 'deep-equal';
import { AccountSelector } from './AccountSelector';
import * as A from '../engine/Accounts';
import { DropdownField } from '../util-ui/DropdownField';
import { PricedItemSelector } from './PricedItemSelector';


/**
 * The main component for editing a new or an existing account.
 */
export class AccountEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onAccountsModify = this.onAccountsModify.bind(this);

        this.onFinish = this.onFinish.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onParentChange = this.onParentChange.bind(this);

        this.onTypeChange = this.onTypeChange.bind(this);
        this.onPricedItemChange = this.onPricedItemChange.bind(this);
        this.onNewPricedItem = this.onNewPricedItem.bind(this);

        this.onNameChange = this.onNameChange.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);
        this.onRefIdChange = this.onRefIdChange.bind(this);

        this.onRenderPage = this.onRenderPage.bind(this);

        this.setErrorMsg = this.setErrorMsg.bind(this);

        let accountDataItem = {};

        const { accessor, accountId, } = this.props;
        this._idBase = 'AccountEditor_' + (accountId || '0');

        if (accountId) {
            accountDataItem = accessor.getAccountDataItemWithId(accountId);
        }
        else {
            let { parentAccountId } = this.props;
            if (!parentAccountId) {
                parentAccountId = accessor.getRootAssetAccountId();
            }

            accountDataItem.parentAccountId = parentAccountId;

            const parentAccountDataItem = accessor.getAccountDataItemWithId(
                parentAccountId);
            accountDataItem.type = parentAccountDataItem.type;
            accountDataItem.pricedItemId = parentAccountDataItem.pricedItemId;
        }

        this.state = {
            accountDataItem: accountDataItem,
            originalAccountDataItem: A.getAccountDataItem(accountDataItem, true),
            isOKToSave: (accountId !== undefined),
        };
    }


    onAccountsModify(result) {
        const { newAccountDataItems } = result;
        for (let newAccountDataItem of newAccountDataItems) {
            if (newAccountDataItem.id === this.props.accountId) {
                this.updateAccountDataItem(newAccountDataItem);
                break;
            }
        }
    }


    componentDidMount() {
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.updateAccountDataItem({});
    }


    componentWillUnmount() {
        this.props.accessor.off('accountsModify', this.onAccountsModify);
    }


    setModal(modal) {
        this.setState({
            modal: modal,
        });
    }


    setErrorMsg(errorMsg) {
        this.setState({
            errorMsg: errorMsg
        });
    }


    isSomethingToSave() {
        const { accountId, accessor } = this.props;
        if (!accountId) {
            return this.state.isOKToSave;
        }

        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        return !deepEqual(this.state.accountDataItem, accountDataItem);
    }


    onFinish() {
        if (this.state.isOKToSave) {
            if (this.isSomethingToSave()) {
                const { accountId, accessor } = this.props;
                const { accountDataItem } = this.state;
                
                let action;
                const accountingActions = accessor.getAccountingActions();
                if (accountId) {
                    action = accountingActions.createModifyAccountAction(accountDataItem);
                }
                else {
                    action = accountingActions.createAddAccountAction(
                        accountDataItem, this.props.childListIndex);
                }

                accessor.asyncApplyAction(action)
                    .then(() => {
                        this.props.onClose();
                    })
                    .catch((e) => {
                        this.setErrorMsg(e);
                    });
            }
        }
    }


    onCancel() {
        if (this.state.isOKToSave && this.isSomethingToSave()) {
            this.setModal(() =>
                <QuestionPrompter
                    title={userMsg('AccountEditor-prompt_cancel_title')}
                    message={userMsg('AccountEditor-prompt_cancel_msg')}
                    buttons={StandardButton.YES_NO}
                    onButton={(id) => {
                        if (id === 'yes') {
                            this.props.onClose();
                        }
                        this.setModal(undefined);
                    }}
                />
            );
        }
        else {
            this.props.onClose();
        }
    }


    updateAccountDataItem(changes, reloadOriginal) {
        this.setState((state) => {
            const newAccountDataItem 
                = Object.assign({}, state.accountDataItem, changes);
            
            const { accessor } = this.props;
            let { originalAccountDataItem } = state;
            if (reloadOriginal) {
                originalAccountDataItem = A.getAccountDataItem(newAccountDataItem, true);
            }

            // TODO:
            // Update isOKToSave
            let isOKToSave = true;

            let nameErrorMsg;
            if (!newAccountDataItem.name) {
                isOKToSave = false;
                nameErrorMsg = userMsg('AccountEditor-name_required');
            }
            else {
                // Check if name is already used in parent.
                if (!originalAccountDataItem
                 || (originalAccountDataItem.parentAccountId 
                  !== newAccountDataItem.parentAccountId)
                 || (originalAccountDataItem.name !== newAccountDataItem.name)) {
                    const parentAccountDataItem = accessor.getAccountDataItemWithId(
                        newAccountDataItem.parentAccountId);
                    const { childAccountIds } = parentAccountDataItem;
                    for (let i = 0; i < childAccountIds.length; ++i) {
                        const siblingAccountDataItem = accessor.getAccountDataItemWithId(
                            childAccountIds[i]
                        );
                        if (siblingAccountDataItem.name === newAccountDataItem.name) {
                            isOKToSave = false;
                            nameErrorMsg = userMsg('AccountEditor-name_duplicate');
                            break;
                        }
                    }
                }
            }

            let refIdErrorMsg;
            if (newAccountDataItem.refId) {
                const refIdAccountDataItem = accessor.getAccountDataItemWithRefId(
                    newAccountDataItem.refId);
                if (refIdAccountDataItem) {
                    const { accountId } = this.props;
                    if (!accountId
                     || (refIdAccountDataItem.id !== accountId)) {
                        isOKToSave = false;
                        refIdErrorMsg = userMsg('AccountEditor-refId_duplicate');
                    }
                }
            }

            return {
                accountDataItem: newAccountDataItem,
                isOKToSave: isOKToSave,
                nameErrorMsg: nameErrorMsg,
                refIdErrorMsg: refIdErrorMsg,
                originalAccountDataItem: originalAccountDataItem,
            };
        });
    }


    onParentChange(e) {
        this.updateAccountDataItem({
            parentAccountId: parseInt(e.target.value),
        });
    }


    addAccountsToAccountEntries(accountId, accountEntries) {
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(accountId);
        const type = A.getAccountType(accountDataItem.type);
        if (!type.allowedChildTypes.length) {
            return;
        }

        accountEntries.push({
            accountId: accountId,
        });

        if (accountDataItem.childAccountIds) {
            accountDataItem.childAccountIds.forEach((accountId) =>
                this.addAccountsToAccountEntries(accountId, accountEntries));
        }
    }

    renderParentEditor() {
        const { accessor, accountId } = this.props;
        const { accountDataItem } = this.state;
        const accountEntries = [];

        if (accountId) {
            // Limit to the current category...
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);

            const type = A.getAccountType(accountDataItem.type);
            const rootAccountId = accessor.getCategoryRootAccountId(type.category);
            this.addAccountsToAccountEntries(rootAccountId, accountEntries);
        }
        else {
            // Grab all the categories...
            this.addAccountsToAccountEntries(
                accessor.getRootAssetAccountId(), accountEntries);
            this.addAccountsToAccountEntries(
                accessor.getRootLiabilityAccountId(), accountEntries);
            this.addAccountsToAccountEntries(
                accessor.getRootIncomeAccountId(), accountEntries);
            this.addAccountsToAccountEntries(
                accessor.getRootExpenseAccountId(), accountEntries);
            this.addAccountsToAccountEntries(
                accessor.getRootEquityAccountId(), accountEntries);
        
        }

        return <AccountSelector
            accessor={accessor}
            id={this._idBase + '_parent'}
            accountEntries={accountEntries}
            ariaLabel="Parent Account"
            label={userMsg('AccountEditor-parent_label')}
            selectedAccountId={accountDataItem.parentAccountId}
            errorMsg={this.state.parentErrorMsg}
            onChange={this.onParentChange}
        />;
    }



    onTypeChange(e) {
        this.updateAccountDataItem({
            type: e.target.value,
        });
    }

    renderTypeEditor() {
        // Rules:
        //  - Cannot change a lot based account.
        const { accessor } = this.props;
        const { accountDataItem } = this.state;
        const parentAccountDataItem = accessor.getAccountDataItemWithId(
            accountDataItem.parentAccountId);
        
        const typeItems = [];
        if (parentAccountDataItem) {
            const parentType = A.getAccountType(parentAccountDataItem.type);
            parentType.allowedChildTypes.forEach((type) => 
                typeItems.push({
                    value: type.name,
                    text: type.description,
                }) );
        }

        const type = A.getAccountType(accountDataItem.type);
        const disabled = type.hasLots;

        return <DropdownField
            id={this._idBase + '_type'}
            ariaLabel="Account Type"
            label={userMsg('AccountEditor-type_label')}
            items={typeItems}
            value={type.name}
            onChange={this.onTypeChange}
            disabled={disabled}
        />;
    }


    onPricedItemChange(e) {
        this.updateAccountDataItem({
            pricedItemId: parseInt(e.target.value),
        });
    }

    onNewPricedItem() {
        const { onNewPricedItem } = this.props;
        if (onNewPricedItem) {
            onNewPricedItem();
        }
    }

    renderPricedItemEditor() {
        const { accessor } = this.props;
        const { accountDataItem } = this.state;
        const accountType = A.getAccountType(accountDataItem.type);
        const pricedItemTypeName = accountType.pricedItemType.name;

        const items = [];
        const pricedItemIds = accessor.getPricedItemIds();

        pricedItemIds.forEach((pricedItemId) => {
            const pricedItemDataItem 
                = accessor.getPricedItemDataItemWithId(pricedItemId);

            if (pricedItemDataItem.type === pricedItemTypeName) {
                items.push({
                    pricedItemId: pricedItemId,
                });
            }
        });

        const buttonLabel = userMsg('AccountEditor-newPricedItem_' 
            + pricedItemTypeName + '_label');
        const button = <button className="btn btn-outline-secondary"
            aria-label={'New ' + pricedItemTypeName}
            type="button"
            onClick={this.onNewPricedItem}
        >
            {buttonLabel}
        </button>;

        return <PricedItemSelector
            accessor={accessor}
            id={this._idBase + '_parent'}
            pricedItemEntries={items}
            ariaLabel={pricedItemTypeName}
            label={userMsg('AccountEditor-pricedItem_' + pricedItemTypeName + '_label')}
            selectedPricedItemId={accountDataItem.pricedItemId}
            onChange={this.onPricedItemChange}
            appendComponent={button}
        />;
    }


    onNameChange(e) {
        this.updateAccountDataItem({
            name: e.target.value,
        });
    }

    renderNameEditor() {
        return <TextField
            id={this._idBase + '_name'}
            ariaLabel="Account Name"
            label={userMsg('AccountEditor-name_label')}
            value={this.state.accountDataItem.name}
            errorMsg={this.state.nameErrorMsg}
            onChange={this.onNameChange}
        />;
    }


    onDescriptionChange(e) {
        this.updateAccountDataItem({
            description: e.target.value,
        });
    }

    renderDescriptionEditor() {
        return <TextField
            id={this._idBase + '_description'}
            ariaLabel="Description"
            label={userMsg('AccountEditor-description_label')}
            value={this.state.accountDataItem.description}
            onChange={this.onDescriptionChange}
        />;
    }


    onRefIdChange(e) {
        this.updateAccountDataItem({
            refId: e.target.value,
        });
    }

    renderRefIdEditor() {
        return <TextField
            id={this._idBase + '_refId'}
            ariaLabel="Reference Id"
            label={userMsg('AccountEditor-refId_label')}
            value={this.state.accountDataItem.refId}
            errorMsg={this.state.refIdErrorMsg}
            onChange={this.onRefIdChange}
        />;
    }


    onRenderPage() {
        const parentEditor = this.renderParentEditor();
        const typeEditor = this.renderTypeEditor();
        const nameEditor = this.renderNameEditor();
        const descriptionEditor = this.renderDescriptionEditor();
        const pricedItemEditor = this.renderPricedItemEditor();
        const refIdEditor = this.renderRefIdEditor();

        return <div className="container-fluid mt-auto mb-auto text-left">
            <div className="row">
                <div className="col">
                    {parentEditor}
                </div>
                <div className="col">
                    {typeEditor}
                </div>
            </div>
            <div className="row">
                <div className="col">
                    {nameEditor}
                </div>
                <div className="col">
                    {refIdEditor}
                </div>
            </div>
            {descriptionEditor}
            {pricedItemEditor}
        </div>;
    }


    render() {
        const { errorMsg, modal, isOKToSave } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={() => this.setErrorMsg()}
            />;
        }

        if (modal) {
            return modal();
        }

        return <SequentialPages
            pageCount={1}
            onRenderPage={this.onRenderPage}
            onFinish={this.onFinish}
            onCancel={this.onCancel}
            isNextDisabled={!isOKToSave}
        />;
    }
}


AccountEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    accountId: PropTypes.number,
    parentAccountId: PropTypes.number,
    childListIndex: PropTypes.number,
    onClose: PropTypes.func.isRequired,
    onNewPricedItem: PropTypes.func,
};
