/* global APP, $, config, interfaceConfig */

const logger = require('jitsi-meet-logger').getLogger(__filename);

const UI = {};

import Chat from './side_pannels/chat/Chat';
import SidePanels from './side_pannels/SidePanels';
import SideContainerToggler from './side_pannels/SideContainerToggler';
import messageHandler from './util/MessageHandler';
import UIUtil from './util/UIUtil';
import UIEvents from '../../service/UI/UIEvents';
import EtherpadManager from './etherpad/Etherpad';
import SharedVideoManager from './shared_video/SharedVideo';

import VideoLayout from './videolayout/VideoLayout';
import Filmstrip from './videolayout/Filmstrip';

import { JitsiTrackErrors } from '../../react/features/base/lib-jitsi-meet';
import {
    getLocalParticipant,
    showParticipantJoinedNotification
} from '../../react/features/base/participants';
import { destroyLocalTracks } from '../../react/features/base/tracks';
import { openDisplayNamePrompt } from '../../react/features/display-name';
import { setEtherpadHasInitialzied } from '../../react/features/etherpad';
import {
    setNotificationsEnabled,
    showWarningNotification
} from '../../react/features/notifications';
import {
    dockToolbox,
    setToolboxEnabled,
    showToolbox
} from '../../react/features/toolbox';

const EventEmitter = require('events');

UI.messageHandler = messageHandler;
import FollowMe from '../FollowMe';

const eventEmitter = new EventEmitter();

UI.eventEmitter = eventEmitter;

let etherpadManager;
let sharedVideoManager;

let followMeHandler;

const JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP = {
    microphone: {},
    camera: {}
};

JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
    .camera[JitsiTrackErrors.UNSUPPORTED_RESOLUTION]
        = 'dialog.cameraUnsupportedResolutionError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.camera[JitsiTrackErrors.GENERAL]
    = 'dialog.cameraUnknownError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.camera[JitsiTrackErrors.PERMISSION_DENIED]
    = 'dialog.cameraPermissionDeniedError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.camera[JitsiTrackErrors.NOT_FOUND]
    = 'dialog.cameraNotFoundError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.camera[JitsiTrackErrors.CONSTRAINT_FAILED]
    = 'dialog.cameraConstraintFailedError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
    .camera[JitsiTrackErrors.NO_DATA_FROM_SOURCE]
        = 'dialog.cameraNotSendingData';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.microphone[JitsiTrackErrors.GENERAL]
    = 'dialog.micUnknownError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
    .microphone[JitsiTrackErrors.PERMISSION_DENIED]
        = 'dialog.micPermissionDeniedError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.microphone[JitsiTrackErrors.NOT_FOUND]
    = 'dialog.micNotFoundError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
    .microphone[JitsiTrackErrors.CONSTRAINT_FAILED]
        = 'dialog.micConstraintFailedError';
JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
    .microphone[JitsiTrackErrors.NO_DATA_FROM_SOURCE]
        = 'dialog.micNotSendingData';

const UIListeners = new Map([
    [
        UIEvents.ETHERPAD_CLICKED,
        () => etherpadManager && etherpadManager.toggleEtherpad()
    ], [
        UIEvents.SHARED_VIDEO_CLICKED,
        () => sharedVideoManager && sharedVideoManager.toggleSharedVideo()
    ], [
        UIEvents.TOGGLE_CHAT,
        () => UI.toggleChat()
    ], [
        UIEvents.TOGGLE_FILMSTRIP,
        () => UI.handleToggleFilmstrip()
    ], [
        UIEvents.FOLLOW_ME_ENABLED,
        enabled => followMeHandler && followMeHandler.enableFollowMe(enabled)
    ]
]);

/**
 * Indicates if we're currently in full screen mode.
 *
 * @return {boolean} {true} to indicate that we're currently in full screen
 * mode, {false} otherwise
 */
UI.isFullScreen = function() {
    return UIUtil.isFullScreen();
};

/**
 * Returns true if the etherpad window is currently visible.
 * @returns {Boolean} - true if the etherpad window is currently visible.
 */
UI.isEtherpadVisible = function() {
    return Boolean(etherpadManager && etherpadManager.isVisible());
};

/**
 * Returns true if there is a shared video which is being shown (?).
 * @returns {boolean} - true if there is a shared video which is being shown.
 */
UI.isSharedVideoShown = function() {
    return Boolean(sharedVideoManager && sharedVideoManager.isSharedVideoShown);
};

/**
 * Notify user that server has shut down.
 */
UI.notifyGracefulShutdown = function() {
    messageHandler.showError({
        descriptionKey: 'dialog.gracefulShutdown',
        titleKey: 'dialog.serviceUnavailable'
    });
};

/**
 * Notify user that reservation error happened.
 */
UI.notifyReservationError = function(code, msg) {
    messageHandler.showError({
        descriptionArguments: {
            code,
            msg
        },
        descriptionKey: 'dialog.reservationErrorMsg',
        titleKey: 'dialog.reservationError'
    });
};

/**
 * Notify user that he has been kicked from the server.
 */
UI.notifyKicked = function() {
    messageHandler.showError({
        hideErrorSupportLink: true,
        descriptionKey: 'dialog.kickMessage',
        titleKey: 'dialog.sessTerminated'
    });
};

/**
 * Notify user that conference was destroyed.
 * @param reason {string} the reason text
 */
UI.notifyConferenceDestroyed = function(reason) {
    // FIXME: use Session Terminated from translation, but
    // 'reason' text comes from XMPP packet and is not translated
    messageHandler.showError({
        description: reason,
        titleKey: 'dialog.sessTerminated'
    });
};

/**
 * Show chat error.
 * @param err the Error
 * @param msg
 */
UI.showChatError = function(err, msg) {
    if (!interfaceConfig.filmStripOnly) {
        Chat.chatAddError(err, msg);
    }
};

/**
 * Change nickname for the user.
 * @param {string} id user id
 * @param {string} displayName new nickname
 */
UI.changeDisplayName = function(id, displayName) {
    VideoLayout.onDisplayNameChanged(id, displayName);

    if (APP.conference.isLocalId(id) || id === 'localVideoContainer') {
        Chat.setChatConversationMode(Boolean(displayName));
    }
};

/**
 * Sets the "raised hand" status for a participant.
 *
 * @param {string} id - The id of the participant whose raised hand UI should
 * be updated.
 * @param {string} name - The name of the participant with the raised hand
 * update.
 * @param {boolean} raisedHandStatus - Whether the participant's hand is raised
 * or not.
 * @returns {void}
 */
UI.setRaisedHandStatus = (id, name, raisedHandStatus) => {
    VideoLayout.setRaisedHandStatus(id, raisedHandStatus);
    if (raisedHandStatus) {
        messageHandler.participantNotification(
            name,
            'notify.somebody',
            'connected',
            'notify.raisedHand');
    }
};

/**
 * Sets the local "raised hand" status.
 */
UI.setLocalRaisedHandStatus
    = raisedHandStatus =>
        VideoLayout.setRaisedHandStatus(
            APP.conference.getMyUserId(),
            raisedHandStatus);

/**
 * Initialize conference UI.
 */
UI.initConference = function() {
    const { getState } = APP.store;
    const { id, name } = getLocalParticipant(getState);

    // Update default button states before showing the toolbar
    // if local role changes buttons state will be again updated.
    UI.updateLocalRole(APP.conference.isModerator);

    UI.showToolbar();

    const displayName = config.displayJids ? id : name;

    if (displayName) {
        UI.changeDisplayName('localVideoContainer', displayName);
    }

    // FollowMe attempts to copy certain aspects of the moderator's UI into the
    // other participants' UI. Consequently, it needs (1) read and write access
    // to the UI (depending on the moderator role of the local participant) and
    // (2) APP.conference as means of communication between the participants.
    followMeHandler = new FollowMe(APP.conference, UI);
};

/** *
 * Handler for toggling filmstrip
 */
UI.handleToggleFilmstrip = () => UI.toggleFilmstrip();

/**
 * Returns the shared document manager object.
 * @return {EtherpadManager} the shared document manager object
 */
UI.getSharedVideoManager = function() {
    return sharedVideoManager;
};

/**
 * Starts the UI module and initializes all related components.
 *
 * @returns {boolean} true if the UI is ready and the conference should be
 * established, false - otherwise (for example in the case of welcome page)
 */
UI.start = function() {
    document.title = interfaceConfig.APP_NAME;

    // Set the defaults for prompt dialogs.
    $.prompt.setDefaults({ persistent: false });

    SideContainerToggler.init(eventEmitter);
    Filmstrip.init(eventEmitter);

    VideoLayout.init(eventEmitter);
    if (!interfaceConfig.filmStripOnly) {
        VideoLayout.initLargeVideo();
    }

    // Do not animate the video area on UI start (second argument passed into
    // resizeVideoArea) because the animation is not visible anyway. Plus with
    // the current dom layout, the quality label is part of the video layout and
    // will be seen animating in.
    VideoLayout.resizeVideoArea(true, false);

    sharedVideoManager = new SharedVideoManager(eventEmitter);

    if (interfaceConfig.filmStripOnly) {
        $('body').addClass('filmstrip-only');
        Filmstrip.setFilmstripOnly();
        APP.store.dispatch(setNotificationsEnabled(false));
    } else {
        // Initialize recording mode UI.
        if (config.iAmRecorder) {
            VideoLayout.enableDeviceAvailabilityIcons(
                APP.conference.getMyUserId(), false);

            // in case of iAmSipGateway keep local video visible
            if (!config.iAmSipGateway) {
                VideoLayout.setLocalVideoVisible(false);
            }

            APP.store.dispatch(setToolboxEnabled(false));
            APP.store.dispatch(setNotificationsEnabled(false));
            UI.messageHandler.enablePopups(false);
        }

        // Initialize side panels
        SidePanels.init(eventEmitter);
    }

    document.title = interfaceConfig.APP_NAME;
};

/**
 * Setup some UI event listeners.
 */
UI.registerListeners
    = () => UIListeners.forEach((value, key) => UI.addListener(key, value));

/**
 * Unregister some UI event listeners.
 */
UI.unregisterListeners
    = () => UIListeners.forEach((value, key) => UI.removeListener(key, value));

/**
 * Setup some DOM event listeners.
 */
UI.bindEvents = () => {
    /**
     *
     */
    function onResize() {
        SideContainerToggler.resize();
        VideoLayout.resizeVideoArea();
    }

    // Resize and reposition videos in full screen mode.
    $(document).on(
            'webkitfullscreenchange mozfullscreenchange fullscreenchange',
            onResize);

    $(window).resize(onResize);
};

/**
 * Unbind some DOM event listeners.
 */
UI.unbindEvents = () => {
    $(document).off(
            'webkitfullscreenchange mozfullscreenchange fullscreenchange');

    $(window).off('resize');
};

/**
 * Show local stream on UI.
 * @param {JitsiTrack} track stream to show
 */
UI.addLocalStream = track => {
    switch (track.getType()) {
    case 'audio':
        // Local audio is not rendered so no further action is needed at this
        // point.
        break;
    case 'video':
        VideoLayout.changeLocalVideo(track);
        break;
    default:
        logger.error(`Unknown stream type: ${track.getType()}`);
        break;
    }
};

/**
 * Removed remote stream from UI.
 * @param {JitsiTrack} track stream to remove
 */
UI.removeRemoteStream = track => VideoLayout.onRemoteStreamRemoved(track);

/**
 * Setup and show Etherpad.
 * @param {string} name etherpad id
 */
UI.initEtherpad = name => {
    if (etherpadManager || !config.etherpad_base || !name) {
        return;
    }
    logger.log('Etherpad is enabled');
    etherpadManager
        = new EtherpadManager(config.etherpad_base, name, eventEmitter);

    APP.store.dispatch(setEtherpadHasInitialzied());
};

/**
 * Returns the shared document manager object.
 * @return {EtherpadManager} the shared document manager object
 */
UI.getSharedDocumentManager = () => etherpadManager;

/**
 * Show user on UI.
 * @param {JitsiParticipant} user
 */
UI.addUser = function(user) {
    const id = user.getId();
    const displayName = user.getDisplayName();
    const status = user.getStatus();

    if (status) {
        // FIXME: move updateUserStatus in participantPresenceChanged action
        UI.updateUserStatus(user, status);
    } else {
        APP.store.dispatch(showParticipantJoinedNotification(displayName));
    }

    // set initial display name
    if (displayName) {
        UI.changeDisplayName(id, displayName);
    }
};

/**
 * Update videotype for specified user.
 * @param {string} id user id
 * @param {string} newVideoType new videotype
 */
UI.onPeerVideoTypeChanged
    = (id, newVideoType) => VideoLayout.onVideoTypeChanged(id, newVideoType);

/**
 * Update local user role and show notification if user is moderator.
 * @param {boolean} isModerator if local user is moderator or not
 */
UI.updateLocalRole = isModerator => {
    VideoLayout.showModeratorIndicator();

    if (isModerator && !interfaceConfig.DISABLE_FOCUS_INDICATOR) {
        messageHandler.participantNotification(
            null, 'notify.me', 'connected', 'notify.moderator');
    }
};

/**
 * Check the role for the user and reflect it in the UI, moderator ui indication
 * and notifies user who is the moderator
 * @param user to check for moderator
 */
UI.updateUserRole = user => {
    VideoLayout.showModeratorIndicator();

    // We don't need to show moderator notifications when the focus (moderator)
    // indicator is disabled.
    if (!user.isModerator() || interfaceConfig.DISABLE_FOCUS_INDICATOR) {
        return;
    }

    const displayName = user.getDisplayName();

    messageHandler.participantNotification(
        displayName,
        'notify.somebody',
        'connected',
        'notify.grantedTo',
        { to: displayName
            ? UIUtil.escapeHtml(displayName) : '$t(notify.somebody)' });
};

/**
 * Updates the user status.
 *
 * @param {JitsiParticipant} user - The user which status we need to update.
 * @param {string} status - The new status.
 */
UI.updateUserStatus = (user, status) => {
    const reduxState = APP.store.getState() || {};
    const { calleeInfoVisible } = reduxState['features/invite'] || {};

    if (!status || calleeInfoVisible) {
        return;
    }

    const displayName = user.getDisplayName();

    messageHandler.participantNotification(
        displayName,
        '',
        'connected',
        'dialOut.statusMessage',
        { status: UIUtil.escapeHtml(status) });
};

/**
 * Toggles smileys in the chat.
 */
UI.toggleSmileys = () => Chat.toggleSmileys();

/**
 * Toggles filmstrip.
 */
UI.toggleFilmstrip = function() {
    // eslint-disable-next-line prefer-rest-params
    Filmstrip.toggleFilmstrip(...arguments);
    VideoLayout.resizeVideoArea(true, false);
};

/**
 * Checks if the filmstrip is currently visible or not.
 * @returns {true} if the filmstrip is currently visible, and false otherwise.
 */
UI.isFilmstripVisible = () => Filmstrip.isFilmstripVisible();

/**
 * @returns {true} if the chat panel is currently visible, and false otherwise.
 */
UI.isChatVisible = () => Chat.isVisible();

/**
 * Toggles chat panel.
 */
UI.toggleChat = () => UI.toggleSidePanel('chat_container');

/**
 * Toggles the given side panel.
 *
 * @param {String} sidePanelId the identifier of the side panel to toggle
 */
UI.toggleSidePanel = sidePanelId => SideContainerToggler.toggle(sidePanelId);


/**
 * Handle new user display name.
 */
UI.inputDisplayNameHandler = function(newDisplayName) {
    eventEmitter.emit(UIEvents.NICKNAME_CHANGED, newDisplayName);
};

/**
 * Return the type of the remote video.
 * @param jid the jid for the remote video
 * @returns the video type video or screen.
 */
UI.getRemoteVideoType = function(jid) {
    return VideoLayout.getRemoteVideoType(jid);
};

// FIXME check if someone user this
UI.showLoginPopup = function(callback) {
    logger.log('password is required');

    const message
        = `<input name="username" type="text"
                placeholder="user@domain.net"
                class="input-control" autofocus>
         <input name="password" type="password"
                data-i18n="[placeholder]dialog.userPassword"
                class="input-control"
                placeholder="user password">`

    ;

    // eslint-disable-next-line max-params
    const submitFunction = (e, v, m, f) => {
        if (v && f.username && f.password) {
            callback(f.username, f.password);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.passwordRequired',
        msgString: message,
        leftButtonKey: 'dialog.Ok',
        submitFunction,
        focus: ':input:first'
    });
};

UI.askForNickname = function() {
    // eslint-disable-next-line no-alert
    return window.prompt('Your nickname (optional)');
};

/**
 * Sets muted audio state for participant
 */
UI.setAudioMuted = function(id, muted) {
    VideoLayout.onAudioMute(id, muted);
    if (APP.conference.isLocalId(id)) {
        APP.conference.updateAudioIconEnabled();
    }
};

/**
 * Sets muted video state for participant
 */
UI.setVideoMuted = function(id, muted) {
    VideoLayout.onVideoMute(id, muted);
    if (APP.conference.isLocalId(id)) {
        APP.conference.updateVideoIconEnabled();
    }
};

/**
 * Triggers an update of remote video and large video displays so they may pick
 * up any state changes that have occurred elsewhere.
 *
 * @returns {void}
 */
UI.updateAllVideos = () => VideoLayout.updateAllVideos();

/**
 * Adds a listener that would be notified on the given type of event.
 *
 * @param type the type of the event we're listening for
 * @param listener a function that would be called when notified
 */
UI.addListener = function(type, listener) {
    eventEmitter.on(type, listener);
};

/**
 * Removes the given listener for the given type of event.
 *
 * @param type the type of the event we're listening for
 * @param listener the listener we want to remove
 */
UI.removeListener = function(type, listener) {
    eventEmitter.removeListener(type, listener);
};

/**
 * Emits the event of given type by specifying the parameters in options.
 *
 * @param type the type of the event we're emitting
 * @param options the parameters for the event
 */
UI.emitEvent = (type, ...options) => eventEmitter.emit(type, ...options);

UI.clickOnVideo = function(videoNumber) {
    const videos = $('#remoteVideos .videocontainer:not(#mixedstream)');
    const videosLength = videos.length;

    if (videosLength <= videoNumber) {
        return;
    }
    const videoIndex = videoNumber === 0 ? 0 : videosLength - videoNumber;

    videos[videoIndex].click();
};

// Used by torture.
UI.showToolbar = timeout => APP.store.dispatch(showToolbox(timeout));

// Used by torture.
UI.dockToolbar = dock => APP.store.dispatch(dockToolbox(dock));

/**
 * Updates the displayed avatar for participant.
 *
 * @param {string} id - User id whose avatar should be updated.
 * @param {string} avatarURL - The URL to avatar image to display.
 * @returns {void}
 */
UI.refreshAvatarDisplay = function(id, avatarURL) {
    VideoLayout.changeUserAvatar(id, avatarURL);
};

/**
 * Notify user that connection failed.
 * @param {string} stropheErrorMsg raw Strophe error message
 */
UI.notifyConnectionFailed = function(stropheErrorMsg) {
    let descriptionKey;
    let descriptionArguments;

    if (stropheErrorMsg) {
        descriptionKey = 'dialog.connectErrorWithMsg';
        descriptionArguments = { msg: stropheErrorMsg };
    } else {
        descriptionKey = 'dialog.connectError';
    }

    messageHandler.showError({
        descriptionArguments,
        descriptionKey,
        titleKey: 'connection.CONNFAIL'
    });
};


/**
 * Notify user that maximum users limit has been reached.
 */
UI.notifyMaxUsersLimitReached = function() {
    messageHandler.showError({
        hideErrorSupportLink: true,
        descriptionKey: 'dialog.maxUsersLimitReached',
        titleKey: 'dialog.maxUsersLimitReachedTitle'
    });
};

/**
 * Notify user that he was automatically muted when joned the conference.
 */
UI.notifyInitiallyMuted = function() {
    messageHandler.participantNotification(
        null,
        'notify.mutedTitle',
        'connected',
        'notify.muted',
        null);
};

UI.handleLastNEndpoints = function(leavingIds, enteringIds) {
    VideoLayout.onLastNEndpointsChanged(leavingIds, enteringIds);
};

/**
 * Prompt user for nickname.
 */
UI.promptDisplayName = () => {
    APP.store.dispatch(openDisplayNamePrompt());
};

/**
 * Update audio level visualization for specified user.
 * @param {string} id user id
 * @param {number} lvl audio level
 */
UI.setAudioLevel = (id, lvl) => VideoLayout.setAudioLevel(id, lvl);

/**
 * Hide connection quality statistics from UI.
 */
UI.hideStats = function() {
    VideoLayout.hideStats();
};

/**
 * Add chat message.
 * @param {string} from user id
 * @param {string} displayName user nickname
 * @param {string} message message text
 * @param {number} stamp timestamp when message was created
 */
// eslint-disable-next-line max-params
UI.addMessage = function(from, displayName, message, stamp) {
    Chat.updateChatConversation(from, displayName, message, stamp);
};

UI.notifyTokenAuthFailed = function() {
    messageHandler.showError({
        descriptionKey: 'dialog.tokenAuthFailed',
        titleKey: 'dialog.tokenAuthFailedTitle'
    });
};

UI.notifyInternalError = function(error) {
    messageHandler.showError({
        descriptionArguments: { error },
        descriptionKey: 'dialog.internalError',
        titleKey: 'dialog.internalErrorTitle'
    });
};

UI.notifyFocusDisconnected = function(focus, retrySec) {
    messageHandler.participantNotification(
        null, 'notify.focus',
        'disconnected', 'notify.focusFail',
        { component: focus,
            ms: retrySec }
    );
};

/**
 * Notifies interested listeners that the raise hand property has changed.
 *
 * @param {boolean} isRaisedHand indicates the current state of the
 * "raised hand"
 */
UI.onLocalRaiseHandChanged = function(isRaisedHand) {
    eventEmitter.emit(UIEvents.LOCAL_RAISE_HAND_CHANGED, isRaisedHand);
};

/**
 * Update list of available physical devices.
 */
UI.onAvailableDevicesChanged = function() {
    APP.conference.updateAudioIconEnabled();
    APP.conference.updateVideoIconEnabled();
};

/**
 * Returns the id of the current video shown on large.
 * Currently used by tests (torture).
 */
UI.getLargeVideoID = function() {
    return VideoLayout.getLargeVideoID();
};

/**
 * Returns the current video shown on large.
 * Currently used by tests (torture).
 */
UI.getLargeVideo = function() {
    return VideoLayout.getLargeVideo();
};

/**
 * Shows "Please go to chrome webstore to install the desktop sharing extension"
 * 2 button dialog with buttons - cancel and go to web store.
 * @param url {string} the url of the extension.
 */
UI.showExtensionExternalInstallationDialog = function(url) {
    let openedWindow = null;

    const submitFunction = function(e, v) {
        if (v) {
            e.preventDefault();
            if (openedWindow === null || openedWindow.closed) {
                openedWindow
                    = window.open(
                        url,
                        'extension_store_window',
                        'resizable,scrollbars=yes,status=1');
            } else {
                openedWindow.focus();
            }
        }
    };

    const closeFunction = function(e, v) {
        if (openedWindow) {
            // Ideally we would close the popup, but this does not seem to work
            // on Chrome. Leaving it uncommented in case it could work
            // in some version.
            openedWindow.close();
            openedWindow = null;
        }
        if (!v) {
            eventEmitter.emit(UIEvents.EXTERNAL_INSTALLATION_CANCELED);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.externalInstallationTitle',
        msgKey: 'dialog.externalInstallationMsg',
        leftButtonKey: 'dialog.goToStore',
        submitFunction,
        loadedFunction: $.noop,
        closeFunction
    });
};

/**
 * Shows a dialog which asks user to install the extension. This one is
 * displayed after installation is triggered from the script, but fails because
 * it must be initiated by user gesture.
 * @param callback {function} function to be executed after user clicks
 * the install button - it should make another attempt to install the extension.
 */
UI.showExtensionInlineInstallationDialog = function(callback) {
    const submitFunction = function(e, v) {
        if (v) {
            callback();
        }
    };

    const closeFunction = function(e, v) {
        if (!v) {
            eventEmitter.emit(UIEvents.EXTERNAL_INSTALLATION_CANCELED);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.externalInstallationTitle',
        msgKey: 'dialog.inlineInstallationMsg',
        leftButtonKey: 'dialog.inlineInstallExtension',
        submitFunction,
        loadedFunction: $.noop,
        closeFunction
    });
};

/**
 * Shows a notifications about the passed in microphone error.
 *
 * @param {JitsiTrackError} micError - An error object related to using or
 * acquiring an audio stream.
 * @returns {void}
 */
UI.showMicErrorNotification = function(micError) {
    if (!micError) {
        return;
    }

    const { message, name } = micError;

    const micJitsiTrackErrorMsg
        = JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.microphone[name];
    const micErrorMsg = micJitsiTrackErrorMsg
        || JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
            .microphone[JitsiTrackErrors.GENERAL];
    const additionalMicErrorMsg = micJitsiTrackErrorMsg ? null : message;

    APP.store.dispatch(showWarningNotification({
        description: additionalMicErrorMsg,
        descriptionKey: micErrorMsg,
        titleKey: name === JitsiTrackErrors.PERMISSION_DENIED
            ? 'deviceError.microphonePermission'
            : 'deviceError.microphoneError'
    }));
};

/**
 * Shows a notifications about the passed in camera error.
 *
 * @param {JitsiTrackError} cameraError - An error object related to using or
 * acquiring a video stream.
 * @returns {void}
 */
UI.showCameraErrorNotification = function(cameraError) {
    if (!cameraError) {
        return;
    }

    const { message, name } = cameraError;

    const cameraJitsiTrackErrorMsg
        = JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP.camera[name];
    const cameraErrorMsg = cameraJitsiTrackErrorMsg
        || JITSI_TRACK_ERROR_TO_MESSAGE_KEY_MAP
            .camera[JitsiTrackErrors.GENERAL];
    const additionalCameraErrorMsg = cameraJitsiTrackErrorMsg ? null : message;

    APP.store.dispatch(showWarningNotification({
        description: additionalCameraErrorMsg,
        descriptionKey: cameraErrorMsg,
        titleKey: name === JitsiTrackErrors.PERMISSION_DENIED
            ? 'deviceError.cameraPermission' : 'deviceError.cameraError'
    }));
};

/**
 * Shows error dialog that informs the user that no data is received from the
 * device.
 *
 * @param {boolean} isAudioTrack - Whether or not the dialog is for an audio
 * track error.
 * @returns {void}
 */
UI.showTrackNotWorkingDialog = function(isAudioTrack) {
    messageHandler.showError({
        descriptionKey: isAudioTrack
            ? 'dialog.micNotSendingData' : 'dialog.cameraNotSendingData',
        titleKey: isAudioTrack
            ? 'dialog.micNotSendingDataTitle'
            : 'dialog.cameraNotSendingDataTitle'
    });
};

UI.updateDevicesAvailability = function(id, devices) {
    VideoLayout.setDeviceAvailabilityIcons(id, devices);
};

/**
 * Show shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} url video url
 * @param {string} attributes
*/
UI.onSharedVideoStart = function(id, url, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoStart(id, url, attributes);
    }
};

/**
 * Update shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} url video url
 * @param {string} attributes
 */
UI.onSharedVideoUpdate = function(id, url, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoUpdate(id, url, attributes);
    }
};

/**
 * Stop showing shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} attributes
 */
UI.onSharedVideoStop = function(id, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoStop(id, attributes);
    }
};

/**
 * Handles user's features changes.
 */
UI.onUserFeaturesChanged = user => VideoLayout.onUserFeaturesChanged(user);

/**
 * Returns the number of known remote videos.
 *
 * @returns {number} The number of remote videos.
 */
UI.getRemoteVideosCount = () => VideoLayout.getRemoteVideosCount();

/**
 * Sets the remote control active status for a remote participant.
 *
 * @param {string} participantID - The id of the remote participant.
 * @param {boolean} isActive - The new remote control active status.
 * @returns {void}
 */
UI.setRemoteControlActiveStatus = function(participantID, isActive) {
    VideoLayout.setRemoteControlActiveStatus(participantID, isActive);
};

/**
 * Sets the remote control active status for the local participant.
 *
 * @returns {void}
 */
UI.setLocalRemoteControlActiveChanged = function() {
    VideoLayout.setLocalRemoteControlActiveChanged();
};

/**
 * Remove media tracks and UI elements so the user no longer sees media in the
 * UI. The intent is to provide a feeling that the meeting has ended.
 *
 * @returns {void}
 */
UI.removeLocalMedia = function() {
    APP.store.dispatch(destroyLocalTracks());
    VideoLayout.resetLargeVideo();
    $('#videospace').hide();
};

// TODO: Export every function separately. For now there is no point of doing
// this because we are importing everything.
export default UI;
