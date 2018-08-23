// @flow

import md5 from 'js-md5';

import { setCalendarEvents } from './actions';
import { APP_LINK_SCHEME, parseURIString } from '../base/util';
import { MAX_LIST_LENGTH } from './constants';

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * Updates the calendar entries in redux when new list is received. The feature
 * calendar-sync doesn't display all calendar events, it displays unique
 * title, URL, and start time tuples i.e. it doesn't display subsequent
 * occurrences of recurring events, and the repetitions of events coming from
 * multiple calendars.
 *
 * XXX The function's {@code this} is the redux store.
 *
 * @param {Array<CalendarEntry>} events - The new event list.
 * @private
 * @returns {void}
 */
export function _updateCalendarEntries(events: Array<Object>) {
    if (!events || !events.length) {
        return;
    }

    // eslint-disable-next-line no-invalid-this
    const { dispatch, getState } = this;
    const knownDomains = getState()['features/base/known-domains'];
    const now = Date.now();
    const entryMap = new Map();

    for (const event of events) {
        const entry = _parseCalendarEntry(event, knownDomains);

        if (entry && entry.endDate > now) {
            // As was stated above, we don't display subsequent occurrences of
            // recurring events, and the repetitions of events coming from
            // multiple calendars.
            const key = md5.hex(JSON.stringify([

                // Obviously, we want to display different conference/meetings
                // URLs. URLs are the very reason why we implemented the feature
                // calendar-sync in the first place.
                entry.url,

                // We probably want to display one and the same URL to people if
                // they have it under different titles in their Calendar.
                // Because maybe they remember the title of the meeting, not the
                // URL so they expect to see the title without realizing that
                // they have the same URL already under a different title.
                entry.title,

                // XXX Eventually, given that the URL and the title are the
                // same, what sets one event apart from another is the start
                // time of the day (note the use of toTimeString() bellow)! The
                // day itself is not important because we don't want multiple
                // occurrences of a recurring event or repetitions of an even
                // from multiple calendars.
                new Date(entry.startDate).toTimeString()
            ]));
            const existingEntry = entryMap.get(key);

            // We want only the earliest occurrence (which hasn't ended in the
            // past, that is) of a recurring event.
            if (!existingEntry || existingEntry.startDate > entry.startDate) {
                entryMap.set(key, entry);
            }
        }
    }

    dispatch(
        setCalendarEvents(
            Array.from(entryMap.values())
                .sort((a, b) => a.startDate - b.startDate)
                .slice(0, MAX_LIST_LENGTH)));
}

/**
 * Updates the calendar entries in Redux when new list is received.
 *
 * @param {Object} event - An event returned from the native calendar.
 * @param {Array<string>} knownDomains - The known domain list.
 * @private
 * @returns {CalendarEntry}
 */
function _parseCalendarEntry(event, knownDomains) {
    if (event) {
        const url = _getURLFromEvent(event, knownDomains);

        // we only filter events without url on mobile, this is temporary
        // till we implement event edit on mobile
        if (url || navigator.product !== 'ReactNative') {
            const startDate = Date.parse(event.startDate);
            const endDate = Date.parse(event.endDate);

            // we want to hide all events that
            // - has no start or end date
            // - for web, if there is no url and we cannot edit the event (has
            // no calendarId)
            if (isNaN(startDate)
                || isNaN(endDate)
                || (navigator.product !== 'ReactNative'
                        && !url
                        && !event.calendarId)) {
                logger.debug(
                    'Skipping invalid calendar event',
                    event.title,
                    event.startDate,
                    event.endDate,
                    url,
                    event.calendarId
                );
            } else {
                return {
                    calendarId: event.calendarId,
                    endDate,
                    id: event.id,
                    startDate,
                    title: event.title,
                    url
                };
            }
        }
    }

    return null;
}

/**
 * Retrieves a Jitsi Meet URL from an event if present.
 *
 * @param {Object} event - The event to parse.
 * @param {Array<string>} knownDomains - The known domain names.
 * @private
 * @returns {string}
 */
function _getURLFromEvent(event, knownDomains) {
    const linkTerminatorPattern = '[^\\s<>$]';
    const urlRegExp
        = new RegExp(
        `http(s)?://(${knownDomains.join('|')})/${linkTerminatorPattern}+`,
        'gi');
    const schemeRegExp
        = new RegExp(`${APP_LINK_SCHEME}${linkTerminatorPattern}+`, 'gi');
    const fieldsToSearch = [
        event.title,
        event.url,
        event.location,
        event.notes,
        event.description
    ];

    for (const field of fieldsToSearch) {
        if (typeof field === 'string') {
            const matches = urlRegExp.exec(field) || schemeRegExp.exec(field);

            if (matches) {
                const url = parseURIString(matches[0]);

                if (url) {
                    return url.toString();
                }
            }
        }
    }

    return null;
}
