import React from 'react';
import PropTypes from 'prop-types';
//import { userMsg } from '../util/UserMessages';


/**
 * Component for account registers.
 */
export class AccountRegister extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            this.props.accountId);
        return <div>
            I am the account register for account {accountDataItem.name}
        </div>;
    }
}

AccountRegister.propTypes = {
    accessor: PropTypes.object.isRequired,
    accountId: PropTypes.number.isRequired,
};
