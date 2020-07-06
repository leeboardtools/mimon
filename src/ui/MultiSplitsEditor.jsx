import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';


export class MultiSplitsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onDone = this.onDone.bind(this);

        this.state = {

        };
    }

    //
    // Splits editor:
    // Editable table
    //  - Columns:
    //      - Description
    //      - Memo?
    //      - Account
    //      - Debit
    //      - Credit
    //
    // Clear all button
    // Read-only current quantity value for split.


    onDone() {
        const { onDone } = this.props;

        onDone();
    }


    renderControls() {
        return <div className = "container-fluid">
            <div className = "row">
                The current account row.
            </div>
            <div className = "row">
                The main table
            </div>
        </div>;
    }


    render() {
        return <ModalPage
            title = {userMsg('MultiSplitsEditor-title')}
            onDone = {this.onDone}
            onCancel = {this.props.onCancel}
        >
            {this.renderControls()}
        </ModalPage>;
    }
}


MultiSplitsEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    splits: PropTypes.array.isRequired,
    splitIndex: PropTypes.number.isRequired,
    onDone: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
