// @flow
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { FieldTextStateless as TextField } from '@atlaskit/field-text';

import { setPassword } from '../../base/conference';
import { Dialog } from '../../base/dialog';
import { translate } from '../../base/i18n';

/**
 * Implements a React Component which prompts the user when a password is
 * required to join a conference.
 */
class PasswordRequiredPrompt extends Component<*, *> {
    /**
     * PasswordRequiredPrompt component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * The JitsiConference which requires a password.
         *
         * @type {JitsiConference}
         */
        conference: PropTypes.object,
        dispatch: PropTypes.func,
        t: PropTypes.func
    };

    state = {
        password: ''
    };

    /**
     * Initializes a new PasswordRequiredPrompt instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onPasswordChanged = this._onPasswordChanged.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        return (
            <Dialog
                isModal = { true }
                onSubmit = { this._onSubmit }
                titleKey = 'dialog.passwordRequired'
                width = 'small'>
                { this._renderBody() }
            </Dialog>
        );
    }

    /**
     * Display component in dialog body.
     *
     * @returns {ReactElement}
     * @protected
     */
    _renderBody() {
        return (
            <div>
                <TextField
                    autoFocus = { true }
                    compact = { true }
                    label = { this.props.t('dialog.passwordLabel') }
                    name = 'lockKey'
                    onChange = { this._onPasswordChanged }
                    shouldFitContainer = { true }
                    type = 'text'
                    value = { this.state.password } />
            </div>
        );
    }

    _onPasswordChanged: ({ target: { value: * }}) => void;

    /**
     * Notifies this dialog that password has changed.
     *
     * @param {Object} event - The details of the notification/event.
     * @private
     * @returns {void}
     */
    _onPasswordChanged({ target: { value } }) {
        this.setState({
            password: value
        });
    }

    _onSubmit: () => boolean;

    /**
     * Dispatches action to submit value from this dialog.
     *
     * @private
     * @returns {boolean}
     */
    _onSubmit() {
        const { conference } = this.props;

        // We received that password is required, but user is trying anyway to
        // login without a password. Mark the room as not locked in case she
        // succeeds (maybe someone removed the password meanwhile). If it is
        // still locked, another password required will be received and the room
        // again will be marked as locked.
        this.props.dispatch(
            setPassword(conference, conference.join, this.state.password));

        // We have used the password so let's clean it.
        this.setState({
            password: undefined
        });

        return true;
    }
}

export default translate(connect()(PasswordRequiredPrompt));
