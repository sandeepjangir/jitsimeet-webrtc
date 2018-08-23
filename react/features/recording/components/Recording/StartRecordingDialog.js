// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
    createRecordingDialogEvent,
    sendAnalytics
} from '../../../analytics';
import { Dialog } from '../../../base/dialog';
import { JitsiRecordingConstants } from '../../../base/lib-jitsi-meet';

import StartRecordingDialogContent from './StartRecordingDialogContent';
import { getDropboxData } from '../../../dropbox';

type Props = {

    /**
     * The {@code JitsiConference} for the current conference.
     */
    _conference: Object,

    /**
     * The client id for the dropbox authentication.
     */
    _clientId: string,

    /**
     * The dropbox access token.
     */
    _token: string,

    /**
     * The redux dispatch function.
     */
    dispatch: Function,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function
}

type State = {

    /**
     * <tt>true</tt> if we have valid oauth token.
     */
    isTokenValid: boolean,

    /**
     * <tt>true</tt> if we are in process of validating the oauth token.
     */
    isValidating: boolean,

    /**
     * Number of MiB of available space in user's Dropbox account.
     */
    spaceLeft: ?number,

    /**
     * The display name of the user's Dropbox account.
     */
    userName: ?string
};

/**
 * Component for the recording start dialog.
 */
class StartRecordingDialog extends Component<Props, State> {
    /**
     * Initializes a new {@code StartRecordingDialog} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        // Bind event handler so it is only bound once for every instance.
        this._onSubmit = this._onSubmit.bind(this);

        this.state = {
            isTokenValid: false,
            isValidating: false,
            userName: undefined,
            spaceLeft: undefined
        };
    }

    /**
     * Validates the oauth access token.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        if (typeof this.props._token !== 'undefined') {
            this._onTokenUpdated();
        }
    }

    /**
     * Validates the oauth access token.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidUpdate(prevProps) {
        if (this.props._token !== prevProps._token) {
            this._onTokenUpdated();
        }
    }

    /**
     * Validates the dropbox access token and fetches account information.
     *
     * @returns {void}
     */
    _onTokenUpdated() {
        const { _clientId, _token } = this.props;

        if (typeof _token === 'undefined') {
            this.setState({
                isTokenValid: false,
                isValidating: false
            });
        } else {
            this.setState({
                isTokenValid: false,
                isValidating: true
            });
            getDropboxData(_token, _clientId).then(data => {
                if (typeof data === 'undefined') {
                    this.setState({
                        isTokenValid: false,
                        isValidating: false
                    });
                } else {
                    this.setState({
                        isTokenValid: true,
                        isValidating: false,
                        ...data
                    });
                }
            });
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isTokenValid, isValidating, spaceLeft, userName } = this.state;

        return (
            <Dialog
                okDisabled = { !isTokenValid }
                okTitleKey = 'dialog.confirm'
                onSubmit = { this._onSubmit }
                titleKey = 'dialog.recording'
                width = 'small'>
                <StartRecordingDialogContent
                    isTokenValid = { isTokenValid }
                    isValidating = { isValidating }
                    spaceLeft = { spaceLeft }
                    userName = { userName } />
            </Dialog>
        );
    }

    _onSubmit: () => boolean;

    /**
     * Starts a file recording session.
     *
     * @private
     * @returns {boolean} - True (to note that the modal should be closed).
     */
    _onSubmit() {
        sendAnalytics(
            createRecordingDialogEvent('start', 'confirm.button')
        );
        const { _conference, _token } = this.props;

        _conference.startRecording({
            mode: JitsiRecordingConstants.mode.FILE,
            appData: JSON.stringify({
                'file_recording_metadata': {
                    'upload_credentials': {
                        'service_name': 'dropbox',
                        'token': _token
                    }
                }
            })
        });

        return true;
    }

    /**
     * Renders the platform specific dialog content.
     *
     * @protected
     * @returns {React$Component}
     */
    _renderDialogContent: () => React$Component<*>
}

/**
 * Maps (parts of) the Redux state to the associated props for the
 * {@code StartRecordingDialog} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _clientId: string,
 *     _conference: JitsiConference,
 *     _token: string
 * }}
 */
function mapStateToProps(state: Object) {
    return {
        _clientId: state['features/base/config'].dropbox.clientId,
        _conference: state['features/base/conference'].conference,
        _token: state['features/dropbox'].token
    };
}

export default connect(mapStateToProps)(StartRecordingDialog);
