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


export class AccountEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onFinish = this.onFinish.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onParentChange = this.onParentChange.bind(this);

        this.onNameChange = this.onNameChange.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);

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
        };
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
                    action = accountingActions.createAddAccountAction(accountDataItem);
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


    updateAccountDataItem(changes) {
        this.setState((state) => {
            const newAccountDataItem 
                = Object.assign({}, state.accountDataItem, changes);
            
            const { accessor } = this.props;

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
            
            return {
                accountDataItem: newAccountDataItem,
                isOKToSave: isOKToSave,
                nameErrorMsg: nameErrorMsg,
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
        // Rules:
        // New account:
        //  - can pick any account.
        // Existing account:
        //  - Limited to current tree
        //  - Limited to parent accounts that support the current account type.
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


    renderTypeEditor() {
        // Rules:
        //  - Cannot change a lot based account.
    }


    renderPricedItemEditor() {

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


    renderRefIdEditor() {

    }


    onRenderPage() {
        const parentEditor = this.renderParentEditor();
        const typeEditor = this.renderTypeEditor();
        const nameEditor = this.renderNameEditor();
        const descriptionEditor = this.renderDescriptionEditor();
        const pricedItemEditor = this.renderPricedItemEditor();
        const refIdEditor = this.renderRefIdEditor();

        return <div className="container-fluid mt-auto mb-auto text-left">
            {parentEditor}
            {typeEditor}
            {nameEditor}
            {descriptionEditor}
            {pricedItemEditor}
            {refIdEditor}
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
    onClose: PropTypes.func.isRequired,
};
