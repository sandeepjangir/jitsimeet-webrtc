// @flow

import VideoLayout from '../../../modules/UI/videolayout/VideoLayout.js';
import UIEvents from '../../../service/UI/UIEvents';

import { CONFERENCE_JOINED } from '../base/conference';
import {
    DOMINANT_SPEAKER_CHANGED,
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT,
    PARTICIPANT_UPDATED,
    PIN_PARTICIPANT,
    getParticipantById
} from '../base/participants';
import { MiddlewareRegistry } from '../base/redux';
import { TRACK_ADDED } from '../base/tracks';

import { SET_TILE_VIEW } from './actionTypes';

declare var APP: Object;

/**
 * Middleware which intercepts actions and updates the legacy component
 * {@code VideoLayout} as needed. The purpose of this middleware is to redux-ify
 * {@code VideoLayout} without having to simultaneously react-ifying it.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
// eslint-disable-next-line no-unused-vars
MiddlewareRegistry.register(store => next => action => {
    // Purposefully perform additional actions after state update to mimic
    // being connected to the store for updates.
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED:
        VideoLayout.mucJoined();
        break;

    case PARTICIPANT_JOINED:
        if (!action.participant.local) {
            VideoLayout.addRemoteParticipantContainer(
                getParticipantById(store.getState(), action.participant.id));
        }
        break;

    case PARTICIPANT_LEFT:
        VideoLayout.removeParticipantContainer(action.participant.id);
        break;

    case PARTICIPANT_UPDATED: {
        // Look for actions that triggered a change to connectionStatus. This is
        // done instead of changing the connection status change action to be
        // explicit in order to minimize changes to other code.
        if (typeof action.participant.connectionStatus !== 'undefined') {
            VideoLayout.onParticipantConnectionStatusChanged(
                action.participant.id,
                action.participant.connectionStatus);
        }
        break;
    }

    case DOMINANT_SPEAKER_CHANGED:
        VideoLayout.onDominantSpeakerChanged(action.participant.id);
        break;

    case PIN_PARTICIPANT:
        VideoLayout.onPinChange(action.participant.id);
        APP.UI.emitEvent(
            UIEvents.PINNED_ENDPOINT,
            action.participant.id,
            Boolean(action.participant.id));
        break;

    case SET_TILE_VIEW:
        APP.UI.emitEvent(UIEvents.TOGGLED_TILE_VIEW, action.enabled);
        break;

    case TRACK_ADDED:
        if (!action.track.local) {
            VideoLayout.onRemoteStreamAdded(action.track.jitsiTrack);
        }

        break;
    }

    return result;
});
