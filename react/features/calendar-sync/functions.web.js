// @flow

export * from './functions.any';

import {
    CALENDAR_TYPE,
    FETCH_END_DAYS,
    FETCH_START_DAYS
} from './constants';
import { _updateCalendarEntries } from './functions';
import { googleCalendarApi } from './web/googleCalendar';
import { microsoftCalendarApi } from './web/microsoftCalendar';

const logger = require('jitsi-meet-logger').getLogger(__filename);

declare var config: Object;

/**
 * Determines whether the calendar feature is enabled by the web.
 *
 * @returns {boolean} If the app has enabled the calendar feature, {@code true};
 * otherwise, {@code false}.
 */
export function isCalendarEnabled() {
    return Boolean(
        config.enableCalendarIntegration
            && (config.googleApiApplicationClientID
                || config.microsoftApiApplicationClientID));
}

/* eslint-disable no-unused-vars */
/**
 * Reads the user's calendar and updates the stored entries if need be.
 *
 * @param {Object} store - The redux store.
 * @param {boolean} maybePromptForPermission - Flag to tell the app if it should
 * prompt for a calendar permission if it wasn't granted yet.
 * @param {boolean|undefined} forcePermission - Whether to force to re-ask for
 * the permission or not.
 * @private
 * @returns {void}
 */
export function _fetchCalendarEntries(
        store,
        maybePromptForPermission,
        forcePermission) {
    /* eslint-enable no-unused-vars */
    const { dispatch, getState } = store;

    const { integrationType } = getState()['features/calendar-sync'];
    const integration = _getCalendarIntegration(integrationType);

    if (!integration) {
        logger.debug('No calendar type available');

        return;
    }

    dispatch(integration.load())
        .then(() => dispatch(integration._isSignedIn()))
        .then(signedIn => {
            if (signedIn) {
                return Promise.resolve();
            }

            return Promise.reject('Not authorized, please sign in!');
        })
        .then(() => dispatch(integration.getCalendarEntries(
            FETCH_START_DAYS, FETCH_END_DAYS)))
        .then(events => _updateCalendarEntries.call({
            dispatch,
            getState
        }, events))
        .catch(error =>
            logger.error('Error fetching calendar.', error));
}

/**
 * Returns the calendar API implementation by specified type.
 *
 * @param {string} calendarType - The calendar type API as defined in
 * the constant {@link CALENDAR_TYPE}.
 * @private
 * @returns {Object|undefined}
 */
export function _getCalendarIntegration(calendarType: string) {
    switch (calendarType) {
    case CALENDAR_TYPE.GOOGLE:
        return googleCalendarApi;
    case CALENDAR_TYPE.MICROSOFT:
        return microsoftCalendarApi;
    }
}
