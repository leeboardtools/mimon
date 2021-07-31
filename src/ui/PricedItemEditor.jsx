import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';
import { PageBody } from '../util-ui/PageBody';
import { ErrorBoundary } from '../util-ui/ErrorBoundary';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TextField } from '../util-ui/TextField';
import deepEqual from 'deep-equal';
import * as PI from '../engine/PricedItems';
import { CurrencyPricedItemSelector } from './CurrencyPricedItemSelector';
import { DropdownField } from '../util-ui/DropdownField';
import { getDecimalDefinition, getQuantityDefinitionName } from '../util/Quantities';
import { QuantityDefinitionField } from '../util-ui/QuantityDefinitionField';
import { Row, Col } from '../util-ui/RowCols';
import { CheckboxField } from '../util-ui/CheckboxField';


/**
 * The main component for editing a new or an existing pricedItem.
 */
export class PricedItemEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onPricedItemModify = this.onPricedItemModify.bind(this);

        this.onFinish = this.onFinish.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onNameChange = this.onNameChange.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);

        this.onCurrencyChange = this.onCurrencyChange.bind(this);
        this.onQuanitytDefinitionChange = this.onQuanitytDefinitionChange.bind(this);
        this.onTickerChange = this.onTickerChange.bind(this);
        this.onOnlineTypeChange = this.onOnlineTypeChange.bind(this);

        this.onIsInactiveChange = this.onIsInactiveChange.bind(this);
        this.onIsHiddenChange = this.onIsHiddenChange.bind(this);

        this.onRenderPage = this.onRenderPage.bind(this);

        this.setErrorMsg = this.setErrorMsg.bind(this);

        let pricedItemDataItem = {};

        const { accessor, pricedItemId, } = this.props;
        this._idBase = 'PricedItemEditor_' + (pricedItemId || '0');

        const pricedItemType = PI.getPricedItemType(props.pricedItemTypeName); 

        if (pricedItemId) {
            pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        }
        else {
            pricedItemDataItem.type = props.pricedItemTypeName;
            pricedItemDataItem.currency = accessor.getBaseCurrencyCode();

            let quantityDefinition = getDecimalDefinition(2);
            if (pricedItemType.hasTickerSymbol) {
                pricedItemDataItem.onlineUpdateType 
                    = PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name;
                quantityDefinition = accessor.getDefaultSharesQuantityDefinition();
            }
            pricedItemDataItem.quantityDefinition 
                = getQuantityDefinitionName(quantityDefinition);
        }

        this.state = {
            pricedItemType: pricedItemType,
            pricedItemDataItem: pricedItemDataItem,
            originalPricedItemDataItem: PI.getPricedItemDataItem(
                pricedItemDataItem, true),
            isOKToSave: (pricedItemId !== undefined),
        };
    }


    onPricedItemModify(result) {
        const { newPricedItemDataItem } = result;
        if (newPricedItemDataItem.id === this.props.pricedItemId) {
            this.updatePricedItemDataItem(newPricedItemDataItem);
        }
    }


    componentDidMount() {
        this.props.accessor.on('pricedItemModify', this.onPricedItemModify);
        this.updatePricedItemDataItem({});
    }


    componentWillUnmount() {
        this.props.accessor.off('pricedItemModify', this.onPricedItemModify);
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
        const { pricedItemId, accessor } = this.props;
        if (!pricedItemId) {
            return this.state.isOKToSave;
        }

        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        return !deepEqual(this.state.pricedItemDataItem, pricedItemDataItem);
    }


    onFinish() {
        if (this.state.isOKToSave) {
            if (this.isSomethingToSave()) {
                const { pricedItemId, accessor } = this.props;
                const { pricedItemDataItem } = this.state;
                
                let action;
                const accountingActions = accessor.getAccountingActions();
                if (pricedItemId) {
                    action = accountingActions.createModifyPricedItemAction(
                        pricedItemDataItem);
                }
                else {
                    action = accountingActions.createAddPricedItemAction(
                        pricedItemDataItem);
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
                    title={userMsg('PricedItemEditor-prompt_cancel_title')}
                    message={userMsg('PricedItemEditor-prompt_cancel_msg')}
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


    updatePricedItemDataItem(changes, reloadOriginal) {
        this.setState((state) => {
            const newPricedItemDataItem 
                = Object.assign({}, state.pricedItemDataItem, changes);
            
            const { accessor } = this.props;
            let { originalPricedItemDataItem, pricedItemType } = state;
            if (reloadOriginal) {
                originalPricedItemDataItem = PI.getPricedItemDataItem(
                    newPricedItemDataItem, true);
            }

            // TODO:
            // Update isOKToSave
            let isOKToSave = true;

            let tickerErrorMsg;
            if (pricedItemType.hasTickerSymbol) {
                if (!newPricedItemDataItem.ticker) {
                    isOKToSave = false;
                    tickerErrorMsg = userMsg('PricedItemEditor-ticker_required');
                }
                else {
                    // Check if ticker is already used.
                    if (!originalPricedItemDataItem
                     || (originalPricedItemDataItem.ticker 
                      !== newPricedItemDataItem.ticker)) {
                        const pricedItemIds = accessor.getPricedItemIdsForType(
                            pricedItemType);
                        for (let i = 0; i < pricedItemIds.length; ++i) {
                            const pricedItemDataItem 
                                = accessor.getPricedItemDataItemWithId(
                                    pricedItemIds[i]
                                );
                            if (pricedItemDataItem.ticker
                                 === newPricedItemDataItem.ticker) {
                                isOKToSave = false;
                                tickerErrorMsg = userMsg(
                                    'PricedItemEditor-ticker_duplicate');
                                break;
                            }
                        }
                    }
                }
            }

            let nameErrorMsg;
            if (!newPricedItemDataItem.name
             && !newPricedItemDataItem.ticker
             && !tickerErrorMsg) {
                isOKToSave = false;
                nameErrorMsg = userMsg('PricedItemEditor-name_required');
            }
            else if (newPricedItemDataItem.name) {
                // Check if name is already used.
                if (!originalPricedItemDataItem
                 || (originalPricedItemDataItem.name !== newPricedItemDataItem.name)) {
                    const pricedItemIds = accessor.getPricedItemIdsForType(
                        pricedItemType);
                    for (let i = 0; i < pricedItemIds.length; ++i) {
                        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                            pricedItemIds[i]
                        );
                        if (pricedItemDataItem.name === newPricedItemDataItem.name) {
                            isOKToSave = false;
                            nameErrorMsg = userMsg('PricedItemEditor-name_duplicate');
                            break;
                        }
                    }
                }
            }

            return {
                pricedItemDataItem: newPricedItemDataItem,
                isOKToSave: isOKToSave,
                tickerErrorMsg: tickerErrorMsg,
                nameErrorMsg: nameErrorMsg,
                originalPricedItemDataItem: originalPricedItemDataItem,
            };
        });
    }




    onNameChange(e) {
        this.updatePricedItemDataItem({
            name: e.target.value,
        });
    }

    renderNameEditor() {
        return <TextField
            id={this._idBase + '_name'}
            ariaLabel="PricedItem Name"
            label={userMsg('PricedItemEditor-name_label')}
            value={this.state.pricedItemDataItem.name}
            errorMsg={this.state.nameErrorMsg}
            onChange={this.onNameChange}
        />;
    }


    onDescriptionChange(e) {
        this.updatePricedItemDataItem({
            description: e.target.value,
        });
    }

    renderDescriptionEditor() {
        return <TextField
            id={this._idBase + '_description'}
            ariaLabel="Description"
            label={userMsg('PricedItemEditor-description_label')}
            value={this.state.pricedItemDataItem.description}
            onChange={this.onDescriptionChange}
        />;
    }


    onCurrencyChange(currency) {
        this.updatePricedItemDataItem({
            currency: currency,
        });
    }

    renderCurrencyEditor() {
        return <CurrencyPricedItemSelector
            accessor={this.props.accessor}
            id={this._idBase + '_currency'}
            ariaLabel="Currency"
            label={userMsg('PricedItemEditor-currency_label')}
            selectedCurrency={this.state.pricedItemDataItem.currency}
            noBaseCurrency={true}
            shortNames={true}
            onChange={this.onCurrencyChange}
        />;
    }


    onQuanitytDefinitionChange(e) {
        this.updatePricedItemDataItem({
            quantityDefinition: e.target.value,
        });
    }

    renderQuantityDefinitionEditor() {
        return <QuantityDefinitionField
            id={this._idBase + '_quantityDefinition'}
            ariaLabel="Format"
            label={userMsg('PricedItemEditor-quantityDefinition_label')}
            value={this.state.pricedItemDataItem.quantityDefinition}
            onChange={this.onQuanitytDefinitionChange}
        />;
    }



    onTickerChange(e) {
        this.updatePricedItemDataItem({
            ticker: e.target.value,
        });
    }

    renderTickerEditor() {
        if (this.state.pricedItemType.hasTickerSymbol) {
            return <TextField
                id={this._idBase + '_ticker'}
                ariaLabel="Ticker Symbol"
                label={userMsg('PricedItemEditor-ticker_label')}
                value={this.state.pricedItemDataItem.ticker}
                errorMsg={this.state.tickerErrorMsg}
                onChange={this.onTickerChange}
            />;
        }
    }


    onOnlineTypeChange(e) {
        this.updatePricedItemDataItem({
            onlineUpdateType: e.target.value,
        });
    }

    renderOnlineTypeEditor() {
        if (this.state.pricedItemType.hasTickerSymbol) {
            const items = [
                { value: PI.PricedItemOnlineUpdateType.NONE.name,
                    text: PI.PricedItemOnlineUpdateType.NONE.description, },
                { value: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
                    text: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.description, },
            ];

            return <DropdownField
                id={this._idBase + '_onlineType'}
                ariaLabel="Online Update Type"
                label={userMsg('PricedItemEditor-onlineUpdate_label')}
                items={items}
                value={this.state.pricedItemDataItem.onlineUpdateType}
                onChange={this.onOnlineTypeChange}
            />;
        }
    }


    onIsInactiveChange(isCheck) {
        this.updatePricedItemDataItem({
            isInactive: isCheck,
        });
    }

    onIsHiddenChange(isCheck) {
        this.updatePricedItemDataItem({
            isHidden: isCheck,
        });
    }

    renderOptionsEditor() {
        const { pricedItemDataItem } = this.state;
        
        const attributeOptions = [];
        const type = PI.getPricedItemType(pricedItemDataItem.type);
        const { allowedFlagAttributes } = type;
        if (allowedFlagAttributes) {
            allowedFlagAttributes.forEach((attribute) => {
                const label = userMsg('PricedItemEditor-flagAttribute-' + attribute);
                attributeOptions.push(<CheckboxField
                    key = {attribute}
                    ariaLabel = {label}
                    value = {pricedItemDataItem[attribute]}
                    checkboxText = {label}
                    onChange = {(isChecked) => {
                        const change = {};
                        change[attribute] = isChecked;
                        this.updatePricedItemDataItem(change);
                    }}
                    tabIndex = {0}
                />);
            });
        }

        return <React.Fragment>
            <CheckboxField
                ariaLabel = "Is Inactive"
                value = {pricedItemDataItem.isInactive}
                checkboxText = {userMsg('PricedItemEditor-isInactive_label')}
                onChange = {this.onIsInactiveChange}
                tabIndex = {0}
            />
            <CheckboxField
                ariaLabel = "Is Hidden"
                value = {pricedItemDataItem.isHidden}
                checkboxText = {userMsg('PricedItemEditor-isHidden_label')}
                onChange = {this.onIsHiddenChange}
                tabIndex = {0}
            />
            {attributeOptions}
        </React.Fragment>;
        /*
        return <React.Fragment>
            <Row>
                <Col>
                    <Checkbox
                        ariaLabel = "Is Inactive"
                        value = {pricedItemDataItem.isInactive}
                        label = {userMsg('PricedItemEditor-isInactive_label')}
                        onChange = {this.onIsInactiveChange}
                        tabIndex = {0}
                    />
                </Col>
            </Row>
            <Row>
                <Col>
                    <Checkbox
                        ariaLabel = "Is Hidden"
                        value = {pricedItemDataItem.isHidden}
                        label = {userMsg('PricedItemEditor-isHidden_label')}
                        onChange = {this.onIsHiddenChange}
                        tabIndex = {0}
                    />
                </Col>
            </Row>
        </React.Fragment>;
        */
    }


    onRenderPage() {
        const nameEditor = this.renderNameEditor();
        const descriptionEditor = this.renderDescriptionEditor();

        const currencyEditor = this.renderCurrencyEditor();
        const quantityDefinitionEditor = this.renderQuantityDefinitionEditor();
        const tickerEditor = this.renderTickerEditor();
        const onlineTypeEditor = this.renderOnlineTypeEditor();
        const optionsEditor = this.renderOptionsEditor();

        let tickerRow;
        if (tickerEditor) {
            tickerRow = <Row>
                <Col>
                    {tickerEditor}
                </Col>
                <Col>
                    {onlineTypeEditor}
                </Col>
            </Row>;
        }

        return <PageBody classExtras = "Editor-body PricedItemEditor-body">
            {tickerRow}
            <Row>
                <Col classExtras = "Col-6">
                    {nameEditor}
                </Col>
                <Col>
                    {quantityDefinitionEditor}
                </Col>
                <Col>
                    {currencyEditor}
                </Col>
            </Row>
            {descriptionEditor}
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
                onCancel = {this.onCancel}
                doneDisabled={!isOKToSave}
            >
                {this.onRenderPage()}
            </ModalPage>
        </ErrorBoundary>;
    }
}


PricedItemEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    pricedItemId: PropTypes.number,
    pricedItemTypeName: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};
