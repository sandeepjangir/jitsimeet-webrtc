// @flow

import InlineDialog from '@atlaskit/inline-dialog';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { createToolbarEvent, sendAnalytics } from '../../analytics';
import { translate } from '../../base/i18n';
import { JitsiRecordingConstants } from '../../base/lib-jitsi-meet';
import { getParticipantCount } from '../../base/participants';
import { getActiveSession } from '../../recording';
import { ToolbarButton } from '../../toolbox';

import { updateDialInNumbers } from '../actions';

import { InfoDialog } from './info-dialog';

/**
 * The type of the React {@code Component} props of {@link InfoDialogButton}.
 */
type Props = {

    /**
     * The redux state representing the dial-in numbers feature.
     */
    _dialIn: Object,

    /**
     * Whether or not the {@code InfoDialog} should display automatically when
     * in a lonely call.
     */
    _disableAutoShow: boolean,

    /**
     * Whether or not the local participant has joined a
     * {@code JitsiConference}. Used to trigger auto showing of the
     * {@code InfoDialog}.
     */
    _isConferenceJoined: Boolean,

    /**
     * The URL for a currently active live broadcast
     */
    _liveStreamViewURL: ?string,

    /**
     * The number of real participants in the call. If in a lonely call, the
     * {@code InfoDialog} will be automatically shown.
     */
    _participantCount: number,

    /**
     * Whether or not the toolbox, in which this component exists, is visible.
     */
    _toolboxVisible: boolean,

    /**
     * Invoked to toggle display of the info dialog.
     */
    dispatch: Dispatch<*>,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function
};

/**
 * The type of the React {@code Component} state of {@link InfoDialogButton}.
 */
type State = {

    /**
     * Whether or not {@code InfoDialog} should be visible.
     */
    showDialog: boolean
};

/**
 * A React Component for displaying a button which opens a dialog with
 * information about the conference and with ways to invite people.
 *
 * @extends Component
 */
class InfoDialogButton extends Component<Props, State> {
    /**
     * Initializes new {@code InfoDialogButton} instance.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        this.state = {
            showDialog: false
        };

        // Bind event handlers so they are only bound once for every instance.
        this._onDialogClose = this._onDialogClose.bind(this);
        this._onDialogToggle = this._onDialogToggle.bind(this);
    }

    /**
     * Update dial-in numbers {@code InfoDialog}.
     *
     * @inheritdoc
     */
    componentDidMount() {
        if (!this.props._dialIn.numbers) {
            this.props.dispatch(updateDialInNumbers());
        }
    }

    /**
     * Update the visibility of the {@code InfoDialog}.
     *
     * @inheritdoc
     */
    componentWillReceiveProps(nextProps) {
        // Ensure the dialog is closed when the toolbox becomes hidden.
        if (this.state.showDialog && !nextProps._toolboxVisible) {
            this._onDialogClose();

            return;
        }

        this._maybeAutoShowDialog(nextProps);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { _dialIn, _liveStreamViewURL, t } = this.props;
        const { showDialog } = this.state;
        const iconClass = `icon-info ${showDialog ? 'toggled' : ''}`;

        return (
            <div className = 'toolbox-button-wth-dialog'>
                <InlineDialog
                    content = {
                        <InfoDialog
                            dialIn = { _dialIn }
                            liveStreamViewURL = { _liveStreamViewURL }
                            onClose = { this._onDialogClose } /> }
                    isOpen = { showDialog }
                    onClose = { this._onDialogClose }
                    position = { 'top right' }>
                    <ToolbarButton
                        accessibilityLabel = { t('info.accessibilityLabel') }
                        iconName = { iconClass }
                        onClick = { this._onDialogToggle }
                        tooltip = { t('info.tooltip') } />
                </InlineDialog>
            </div>
        );
    }

    /**
     * Invoked to trigger display of the {@code InfoDialog} if certain
     * conditions are met.
     *
     * @param {Object} nextProps - The future properties of this component.
     * @private
     * @returns {void}
     */
    _maybeAutoShowDialog(nextProps) {
        if (!this.props._isConferenceJoined
            && nextProps._isConferenceJoined
            && nextProps._participantCount < 2
            && nextProps._toolboxVisible
            && !nextProps._disableAutoShow) {
            this.setState({ showDialog: true });
        }
    }

    _onDialogClose: () => void;

    /**
     * Hides {@code InfoDialog}.
     *
     * @private
     * @returns {void}
     */
    _onDialogClose() {
        this.setState({ showDialog: false });
    }

    _onDialogToggle: () => void;

    /**
     * Toggles the display of {@code InfoDialog}.
     *
     * @private
     * @returns {void}
     */
    _onDialogToggle() {
        sendAnalytics(createToolbarEvent('info'));

        this.setState({ showDialog: !this.state.showDialog });
    }
}

/**
 * Maps (parts of) the Redux state to the associated {@code InfoDialogButton}
 * component's props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _dialIn: Object,
 *     _disableAutoShow: boolean,
 *     _isConferenceIsJoined: boolean,
 *     _liveStreamViewURL: string,
 *     _participantCount: number,
 *     _toolboxVisible: boolean
 * }}
 */
function _mapStateToProps(state) {
    const currentLiveStreamingSession
        = getActiveSession(state, JitsiRecordingConstants.mode.STREAM);

    return {
        _dialIn: state['features/invite'],
        _disableAutoShow: state['features/base/config'].iAmRecorder,
        _isConferenceJoined:
            Boolean(state['features/base/conference'].conference),
        _liveStreamViewURL:
            currentLiveStreamingSession
                && currentLiveStreamingSession.liveStreamViewURL,
        _participantCount: getParticipantCount(state),
        _toolboxVisible: state['features/toolbox'].visible
    };
}

export default translate(connect(_mapStateToProps)(InfoDialogButton));
