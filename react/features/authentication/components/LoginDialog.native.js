import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Text, TextInput, View } from 'react-native';
import { connect as reduxConnect } from 'react-redux';

import { connect, toJid } from '../../base/connection';
import { Dialog } from '../../base/dialog';
import { translate } from '../../base/i18n';
import { JitsiConnectionErrors } from '../../base/lib-jitsi-meet';

import { authenticateAndUpgradeRole, cancelLogin } from '../actions';
import styles from './styles';

/**
 * Dialog asks user for username and password.
 *
 * First authentication configuration that it will deal with is the main XMPP
 * domain (config.hosts.domain) with password authentication. A LoginDialog
 * will be opened after 'CONNECTION_FAILED' action with
 * 'JitsiConnectionErrors.PASSWORD_REQUIRED' error. After username and password
 * are entered a new 'connect' action from 'features/base/connection' will be
 * triggered which will result in new XMPP connection. The conference will start
 * if the credentials are correct.
 *
 * The second setup is the main XMPP domain with password plus guest domain with
 * anonymous access configured under 'config.hosts.anonymousdomain'. In such
 * case user connects from the anonymous domain, but if the room does not exist
 * yet, Jicofo will not allow to start new conference. This will trigger
 * 'CONFERENCE_FAILED' action with JitsiConferenceErrors.AUTHENTICATION_REQUIRED
 * error and 'authRequired' value of 'features/base/conference' will hold
 * the {@link JitsiConference} instance. If user decides to authenticate, a
 * new/separate XMPP connection is established and authentication is performed.
 * In case it succeeds, Jicofo will assign new session ID which then can be used
 * from the anonymous domain connection to create and join the room. This part
 * is done by {@link JitsiConference#authenticateAndUpgradeRole} in
 * lib-jitsi-meet.
 *
 * See {@link https://github.com/jitsi/jicofo#secure-domain} for a description
 * of the configuration parameters.
 */
class LoginDialog extends Component {
    /**
     * LoginDialog component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * {@link JitsiConference} that needs authentication - will hold a valid
         * value in XMPP login + guest access mode.
         */
        _conference: PropTypes.object,

        /**
         *
         */
        _configHosts: PropTypes.object,

        /**
         * Indicates if the dialog should display "connecting" status message.
         */
        _connecting: PropTypes.bool,

        /**
         * The error which occurred during login/authentication.
         */
        _error: PropTypes.object,

        /**
         * The progress in the floating range between 0 and 1 of the
         * authenticating and upgrading the role of the local participant/user.
         */
        _progress: PropTypes.number,

        /**
         * Redux store dispatch method.
         */
        dispatch: PropTypes.func,

        /**
         * Invoked to obtain translated strings.
         */
        t: PropTypes.func
    };

    /**
     * Initializes a new LoginDialog instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
            username: '',
            password: ''
        };

        // Bind event handlers so they are only bound once per instance.
        this._onCancel = this._onCancel.bind(this);
        this._onLogin = this._onLogin.bind(this);
        this._onPasswordChange = this._onPasswordChange.bind(this);
        this._onUsernameChange = this._onUsernameChange.bind(this);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            _connecting: connecting,
            _error: error,
            _progress: progress,
            t
        } = this.props;

        let messageKey;
        let messageOptions;

        if (progress && progress < 1) {
            messageKey = 'connection.FETCH_SESSION_ID';
        } else if (error) {
            const { name } = error;

            if (name === JitsiConnectionErrors.PASSWORD_REQUIRED) {
                // Show a message that the credentials are incorrect only if the
                // credentials which have caused the connection to fail are the
                // ones which the user sees.
                const { credentials } = error;

                if (credentials
                        && credentials.jid
                            === toJid(
                                this.state.username,
                                this.props._configHosts)
                        && credentials.password === this.state.password) {
                    messageKey = 'dialog.incorrectPassword';
                }
            } else if (name) {
                messageKey = 'dialog.connectErrorWithMsg';
                messageOptions || (messageOptions = {});
                messageOptions.msg = `${name} ${error.message}`;
            }
        }

        return (
            <Dialog
                okDisabled = { connecting }
                onCancel = { this._onCancel }
                onSubmit = { this._onLogin }
                titleKey = 'dialog.passwordRequired'>
                <View style = { styles.loginDialog }>
                    <TextInput
                        autoCapitalize = { 'none' }
                        autoCorrect = { false }
                        onChangeText = { this._onUsernameChange }
                        placeholder = { 'user@domain.com' }
                        style = { styles.dialogTextInput }
                        value = { this.state.username } />
                    <TextInput
                        onChangeText = { this._onPasswordChange }
                        placeholder = { t('dialog.userPassword') }
                        secureTextEntry = { true }
                        style = { styles.dialogTextInput }
                        value = { this.state.password } />
                    <Text style = { styles.dialogText }>
                        {
                            messageKey
                                ? t(messageKey, messageOptions || {})
                                : connecting
                                    ? t('connection.CONNECTING')
                                    : ''
                        }
                    </Text>
                </View>
            </Dialog>
        );
    }

    /**
     * Called when user edits the username.
     *
     * @param {string} text - A new username value entered by user.
     * @returns {void}
     * @private
     */
    _onUsernameChange(text) {
        this.setState({
            username: text
        });
    }

    /**
     * Called when user edits the password.
     *
     * @param {string} text - A new password value entered by user.
     * @returns {void}
     * @private
     */
    _onPasswordChange(text) {
        this.setState({
            password: text
        });
    }

    /**
     * Notifies this LoginDialog that it has been dismissed by cancel.
     *
     * @private
     * @returns {void}
     */
    _onCancel() {
        this.props.dispatch(cancelLogin());
    }

    /**
     * Notifies this LoginDialog that the login button (OK) has been pressed by
     * the user.
     *
     * @private
     * @returns {void}
     */
    _onLogin() {
        const { _conference: conference, dispatch } = this.props;
        const { password, username } = this.state;
        const jid = toJid(username, this.props._configHosts);
        let r;

        // If there's a conference it means that the connection has succeeded,
        // but authentication is required in order to join the room.
        if (conference) {
            r = dispatch(authenticateAndUpgradeRole(jid, password, conference));
        } else {
            r = dispatch(connect(jid, password));
        }

        return r;
    }
}

/**
 * Maps (parts of) the Redux state to the associated props for the
 * {@code LoginDialog} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _conference: JitsiConference,
 *     _configHosts: Object,
 *     _connecting: boolean,
 *     _error: Object,
 *     _progress: number
 * }}
 */
function _mapStateToProps(state) {
    const {
        error: authenticateAndUpgradeRoleError,
        progress,
        thenableWithCancel
    } = state['features/authentication'];
    const { authRequired } = state['features/base/conference'];
    const { hosts: configHosts } = state['features/base/config'];
    const {
        connecting,
        error: connectionError
    } = state['features/base/connection'];

    return {
        _conference: authRequired,
        _configHosts: configHosts,
        _connecting: Boolean(connecting) || Boolean(thenableWithCancel),
        _error: connectionError || authenticateAndUpgradeRoleError,
        _progress: progress
    };
}

export default translate(reduxConnect(_mapStateToProps)(LoginDialog));
