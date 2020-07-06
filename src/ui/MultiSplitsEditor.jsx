import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { SequentialPages } from '../util-ui/SequentialPages';


export class MultiSplitsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onFinish = this.onFinish.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);

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


    onFinish() {
        const { onFinish } = this.props;

        onFinish();
    }


    onRenderPage() {
        return <div>Why hello there...</div>;
    }


    render() {
        return <SequentialPages
            pageCount = {1}
            onRenderPage = {this.onRenderPage}
            onFinish = {this.onFinish}
            onCancel = {this.props.onCancel}
        />;
    }
}


MultiSplitsEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    splits: PropTypes.array.isRequired,
    splitIndex: PropTypes.number.isRequired,
    onFinish: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
