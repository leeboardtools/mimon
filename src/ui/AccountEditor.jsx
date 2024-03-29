import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TextField } from '../util-ui/TextField';
import deepEqual from 'deep-equal';
import { addAccountIdsToAccountEntries, AccountSelectorField } from './AccountSelector';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import { DropdownField } from '../util-ui/DropdownField';
import { PricedItemSelector } from './PricedItemSelector';
import { ModalPage } from '../util-ui/ModalPage';
import { PageBody } from '../util-ui/PageBody';
import { ErrorBoundary } from '../util-ui/ErrorBoundary';
import * as AH from '../tools/AccountHelpers';
import { Row, Col } from '../util-ui/RowCols';
import { Button } from '../util-ui/Button';
import { CheckboxField } from '../util-ui/CheckboxField';


/**
 * The main component for editing a new or an existing account.
 */
export class AccountEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onAccountsModify = this.onAccountsModify.bind(this);

        this.onPricedItemAdd = this.onPricedItemAdd.bind(this);

        this.onFinish = this.onFinish.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onParentChange = this.onParentChange.bind(this);

        this.onTypeChange = this.onTypeChange.bind(this);
        this.onPricedItemChange = this.onPricedItemChange.bind(this);
        this.onNewPricedItem = this.onNewPricedItem.bind(this);
        this.onEndNewPricedItemEdit = this.onEndNewPricedItemEdit.bind(this);

        this.onNameChange = this.onNameChange.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);
        this.onRefIdChange = this.onRefIdChange.bind(this);

        this.onDefaultAccountChange = this.onDefaultAccountChange.bind(this);

        this.onIsInactiveChange = this.onIsInactiveChange.bind(this);
        this.onIsHiddenChange = this.onIsHiddenChange.bind(this);

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
            const parentType = A.getAccountType(parentAccountDataItem.type);
            const type = parentType.allowedChildTypes[0];
            accountDataItem.type = type.name;
            if (type.pricedItemType === PI.PricedItemType.CURRENCY) {
                accountDataItem.pricedItemId = parentAccountDataItem.pricedItemId;
            }
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

    onPricedItemAdd(result) {
        const { accountDataItem } = this.state;
        if (!accountDataItem.pricedItemId) {
            this.updateAccountDataItem({});
        }
    }


    componentDidMount() {
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.props.accessor.on('pricedItemAdd', this.onPricedItemAdd);
        this.updateAccountDataItem({});
    }


    componentWillUnmount() {
        this.props.accessor.off('accountsModify', this.onAccountsModify);
        this.props.accessor.off('pricedItemAdd', this.onPricedItemAdd);
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
                    if (parentAccountDataItem) {
                        const { childAccountIds } = parentAccountDataItem;
                        for (let i = 0; i < childAccountIds.length; ++i) {
                            const siblingAccountDataItem 
                                = accessor.getAccountDataItemWithId(
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


            const accountType = A.getAccountType(newAccountDataItem.type);
            const pricedItemTypeName = accountType.pricedItemType.name;
            const pricedItemType = PI.getPricedItemType(pricedItemTypeName);

            if (newAccountDataItem.pricedItemId) {
                const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                    newAccountDataItem.pricedItemId);
                if (!pricedItemDataItem 
                 || (pricedItemDataItem.type !== pricedItemTypeName)) {
                    newAccountDataItem.pricedItemId = undefined;
                }
            }

            if (!newAccountDataItem.pricedItemId) {
                // Try to select something....
                const pricedItemIds = accessor.getPricedItemIdsForType(
                    pricedItemType);
                if (pricedItemIds && pricedItemIds.length) {
                    newAccountDataItem.pricedItemId = pricedItemIds[0];
                }
            }

            let pricedItemErrorMsg;
            if (!newAccountDataItem.pricedItemId) {
                isOKToSave = false;
                const { description } = pricedItemType;
                pricedItemErrorMsg = userMsg('AccountEditor-pricedItem_required',
                    description);
            }

            return {
                accountDataItem: newAccountDataItem,
                isOKToSave: isOKToSave,
                nameErrorMsg: nameErrorMsg,
                refIdErrorMsg: refIdErrorMsg,
                pricedItemErrorMsg: pricedItemErrorMsg,
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
            addAccountIdsToAccountEntries({
                accessor: this.props.accessor,
                accountEntries: accountEntries,
                accountIds: accountDataItem.childAccountIds,
                sortByName: true,
                labelCallback: AH.getShortAccountAncestorNames,
                filter: (accountId) => {
                    const accountDataItem = this.props.accessor.getAccountDataItemWithId(
                        accountId);
                    const type = A.getAccountType(accountDataItem.type);
                    if (!type.allowedChildTypes.length) {
                        return false;
                    }
                    return true;
                }
            });
        }
    }

    renderParentEditor() {
        const { accessor, accountId } = this.props;
        const { accountDataItem } = this.state;
        const accountEntries = [];
        let disabled;
        let disabledRoot;

        if (accountId) {
            // Limit to the current category...
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);

            const type = A.getAccountType(accountDataItem.type);
            const rootAccountId = accessor.getCategoryRootAccountId(type.category);
            this.addAccountsToAccountEntries(rootAccountId, accountEntries);

            if (!accountDataItem.parentAccountId) {
                disabled = true;
                disabledRoot = true;
            }
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

        return <AccountSelectorField
            accessor={accessor}
            id={this._idBase + '_parent'}
            accountEntries={accountEntries}
            ariaLabel="Parent Account"
            label={userMsg('AccountEditor-parent_label')}
            selectedAccountId={accountDataItem.parentAccountId}
            errorMsg={this.state.parentErrorMsg}
            onChange={this.onParentChange}
            disabled = {disabled}
            disabledRoot = {disabledRoot}
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
        //  - Cannot change a root account.
        const { accessor, accountId } = this.props;
        const { accountDataItem } = this.state;
        const parentAccountDataItem = accessor.getAccountDataItemWithId(
            accountDataItem.parentAccountId);
        
        const type = A.getAccountType(accountDataItem.type);

        const typeItems = [];
        let disabled = false;
        if (parentAccountDataItem) {
            const parentType = A.getAccountType(parentAccountDataItem.type);
            parentType.allowedChildTypes.forEach((type) => 
                typeItems.push({
                    value: type.name,
                    text: type.description,
                    type: type,
                }) );
        }
        else {
            typeItems.push({
                value: type.name,
                text: type.description,
            });
            disabled = true;
        }

        if (!disabled) {
            if (type.hasLots && accountId) {
                // Only allow types that also have lots.
                for (let i = typeItems.length - 1; i >= 0; --i) {
                    if (!typeItems[i].type.hasLots) {
                        typeItems.splice(i, 1);
                    }
                }
            }
        }

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
            const { accountDataItem } = this.state;
            const accountType = A.getAccountType(accountDataItem.type);
            const pricedItemTypeName = accountType.pricedItemType.name;
            onNewPricedItem(pricedItemTypeName, this.onEndNewPricedItemEdit);
        }
    }

    onEndNewPricedItemEdit(pricedItemDataItem) {
        if (pricedItemDataItem) {
            this.setState((state) => {
                return {
                    accountDataItem: Object.assign({}, state.accountDataItem, {
                        pricedItemId: pricedItemDataItem.id,
                    }),
                };
            });
        }
    }


    renderPricedItemEditor() {
        const { accessor } = this.props;
        const { accountDataItem } = this.state;
        const accountType = A.getAccountType(accountDataItem.type);
        const pricedItemTypeName = accountType.pricedItemType.name;
        const pricedItemType = PI.getPricedItemType(pricedItemTypeName);
        const { description } = pricedItemType;

        const items = accessor.getPricedItemIdsForType(pricedItemTypeName).map(
            (id) => {
                return { pricedItemId: id, };
            });

        let button;
        if (pricedItemType !== PI.PricedItemType.CURRENCY) {
            const buttonLabel = userMsg('AccountEditor-newPricedItem_label', description);
            button = <Button classExtras = "Btn-outline-secondary"
                aria-label = {'New ' + pricedItemTypeName}
                onClick = {this.onNewPricedItem}
            >
                {buttonLabel}
            </Button>;
        }

        return <PricedItemSelector
            accessor={accessor}
            id={this._idBase + '_pricedItem'}
            pricedItemEntries={items}
            ariaLabel={pricedItemTypeName}
            label={userMsg('AccountEditor-pricedItem_label', description)}
            selectedPricedItemId={accountDataItem.pricedItemId}
            onChange={this.onPricedItemChange}
            errorMsg={this.state.pricedItemErrorMsg}
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


    onDefaultAccountChange(e, property) {
        const update = {
            defaultSplitAccountIds: Object.assign({},
                this.state.accountDataItem.defaultSplitAccountIds),
        };
        update.defaultSplitAccountIds[property] = parseInt(e.target.value);
        this.updateAccountDataItem(update);
    }


    renderDefaultSplitAccountEditor(defaultSplitAccountType, hasUseParent) {
        const { accessor } = this.props;
        const { accountDataItem } = this.state;

        const { property, category, specialTags } = defaultSplitAccountType;
        let labelName = 'AccountEditor-default_split_account_label_' 
            + defaultSplitAccountType.name;

        if (specialTags) {
            const tags = AH.getDefaultSplitAccountTags(accountDataItem, 
                defaultSplitAccountType);
            if (tags && tags[0]) {
                labelName += '_' + tags[0].name;
            }
        }

        const label = userMsg(labelName);
        const rootAccountId = accessor.getCategoryRootAccountId(category);
        const accountEntries = [];
        this.addAccountsToAccountEntries(rootAccountId, accountEntries);

        let selectedAccountId = AH.getDefaultSplitAccountId({
            accessor: accessor, 
            accountDataItem: accountDataItem,
            defaultSplitAccountType: defaultSplitAccountType,
            keepUseParentAccountId: hasUseParent,
            defaultToUseParentAccountId: hasUseParent,
        });
        
        let defaultEntryText;
        let defaultEntryValue;
        if (hasUseParent) {
            defaultEntryText = userMsg('AccountEditor-default_split_account_use_parent');
            defaultEntryValue = AH.USE_PARENT_ACCOUNT_ID;
        }

        return <AccountSelectorField
            accessor = {accessor}
            id = {this._idBase + property}
            accountEntries = {accountEntries}
            defaultEntryText = {defaultEntryText}
            defaultEntryValue = {defaultEntryValue}
            ariaLabel = {label}
            label = {label}
            selectedAccountId = {selectedAccountId}
            errorMsg = {this.state.parentErrorMsg}
            onChange = {(e) => this.onDefaultAccountChange(e, property)}
        />;

    }


    renderDefaultSplitAccountEditors() {
        const { accountDataItem } = this.state;
        const type = A.getAccountType(accountDataItem.type);
        const category = type.category;

        if ((category !== A.AccountCategory.ASSET) 
         && (category !== A.AccountCategory.LIABILITY)) {
            return;
        }
        if (type.isGroup) {
            return;
        }

        let hasChildLots;
        const { allowedChildTypes } = type;
        if (!type.hasLots && (category === A.AccountCategory.ASSET) 
         && allowedChildTypes) {
            for (let i = allowedChildTypes.length - 1; i >= 0; --i) {
                if (allowedChildTypes[i].hasLots) {
                    hasChildLots = true;
                    break;
                }
            }
        }

        // ESPP
        // Fees         Dividends       LT Cap Gain
        //  -           Ordinary Inc    ST Cap Gain
        //
        // Grant
        // Fees         Dividends       LT Cap Gain
        //  -           Grant Inc       ST Cap Gain
        //
        // Security
        // Fees         Dividends       LT Cap Gain
        //  -           -               ST Cap Gain
        //
        // Other
        // Fees     
        // Interest
        //
        // Brokerage
        // Fees         Dividends       Default LT Cap Gain
        // Interest                     Default ST Cap Gain

        let feesEditor = this.renderDefaultSplitAccountEditor(
            AH.DefaultSplitAccountType.FEES_EXPENSE);
        let interestEditor;
        let dividendsEditor;
        let auxIncomeEditor;
        let longTermCapGainsEditor;
        let shortTermCapGainsEditor;

        if (type.hasLots) {
            if (type.isESPP) {
                auxIncomeEditor = this.renderDefaultSplitAccountEditor(
                    AH.DefaultSplitAccountType.ORDINARY_INCOME);
            }
            else if (type.isStockGrant) {
                auxIncomeEditor = this.renderDefaultSplitAccountEditor(
                    AH.DefaultSplitAccountType.STOCK_GRANTS_INCOME);
            }

            dividendsEditor = this.renderDefaultSplitAccountEditor(
                AH.DefaultSplitAccountType.DIVIDENDS_INCOME,
                true);
            
            longTermCapGainsEditor = this.renderDefaultSplitAccountEditor(
                AH.DefaultSplitAccountType.LONG_TERM_CAPITAL_GAINS_INCOME,
                true);
            
            shortTermCapGainsEditor = this.renderDefaultSplitAccountEditor(
                AH.DefaultSplitAccountType.SHORT_TERM_CAPITAL_GAINS_INCOME,
                true);
        }
        else {
            interestEditor = this.renderDefaultSplitAccountEditor(
                AH.DefaultSplitAccountType.INTEREST_INCOME);

            if (hasChildLots) {
                dividendsEditor = this.renderDefaultSplitAccountEditor(
                    AH.DefaultSplitAccountType.DIVIDENDS_INCOME);
                
                longTermCapGainsEditor = this.renderDefaultSplitAccountEditor(
                    AH.DefaultSplitAccountType.LONG_TERM_CAPITAL_GAINS_INCOME);
                
                shortTermCapGainsEditor = this.renderDefaultSplitAccountEditor(
                    AH.DefaultSplitAccountType.SHORT_TERM_CAPITAL_GAINS_INCOME);
            }
        }

        return <React.Fragment>
            <Row>
                <Col>{feesEditor}</Col>
                <Col>{dividendsEditor}</Col>
                <Col>{longTermCapGainsEditor}</Col>
            </Row>
            <Row>
                <Col>{interestEditor}</Col>
                <Col>{auxIncomeEditor}</Col>
                <Col>{shortTermCapGainsEditor}</Col>
            </Row>
        </React.Fragment>;
    }


    onIsInactiveChange(isCheck) {
        this.updateAccountDataItem({
            isInactive: isCheck,
        });
    }

    onIsHiddenChange(isCheck) {
        this.updateAccountDataItem({
            isHidden: isCheck,
        });
    }


    renderOptionsEditor() {
        const { accountDataItem } = this.state;
        
        const attributeOptions = [];
        const type = A.getAccountType(accountDataItem.type);
        const { allowedFlagAttributes } = type;
        if (allowedFlagAttributes) {
            allowedFlagAttributes.forEach((attribute) => {
                const label = userMsg('AccountEditor-flagAttribute-' + attribute);
                attributeOptions.push(<CheckboxField
                    key = {attribute}
                    ariaLabel = {label}
                    value = {accountDataItem[attribute]}
                    checkboxText = {label}
                    onChange = {(isChecked) => {
                        const change = {};
                        change[attribute] = isChecked;
                        this.updateAccountDataItem(change);
                    }}
                    tabIndex = {0}
                />);
            });
        }

        return <React.Fragment>
            <CheckboxField
                ariaLabel = "Is Inactive"
                value = {accountDataItem.isInactive}
                checkboxText = {userMsg('AccountEditor-isInactive_label')}
                onChange = {this.onIsInactiveChange}
                tabIndex = {0}
            />
            <CheckboxField
                ariaLabel = "Is Hidden"
                value = {accountDataItem.isHidden}
                checkboxText = {userMsg('AccountEditor-isHidden_label')}
                onChange = {this.onIsHiddenChange}
                tabIndex = {0}
            />
            {attributeOptions}
        </React.Fragment>;
    }


    onRenderPage() {
        const parentEditor = this.renderParentEditor();
        const typeEditor = this.renderTypeEditor();
        const nameEditor = this.renderNameEditor();
        const descriptionEditor = this.renderDescriptionEditor();
        const pricedItemEditor = this.renderPricedItemEditor();
        const refIdEditor = this.renderRefIdEditor();
        const defaultSplitAccountEditors = this.renderDefaultSplitAccountEditors();
        const optionsEditor = this.renderOptionsEditor();

        return <PageBody classExtras = "Editor-body AccountEditor-body">
            <Row>
                <Col>
                    {parentEditor}
                </Col>
                <Col>
                    {typeEditor}
                </Col>
            </Row>
            <Row>
                <Col>
                    {nameEditor}
                </Col>
                <Col>
                    {refIdEditor}
                </Col>
            </Row>
            {descriptionEditor}
            {pricedItemEditor}
            {defaultSplitAccountEditors}
            {optionsEditor}
        </PageBody>;
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

        return <ErrorBoundary>
            <ModalPage
                onDone = {this.onFinish}
                doneDisabled = {!isOKToSave}
                onCancel = {this.onCancel}
            >
                {this.onRenderPage()}
            </ModalPage>
        </ErrorBoundary>;
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
