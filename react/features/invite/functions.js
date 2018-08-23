// @flow

import { getAppProp } from '../base/app';
import { i18next } from '../base/i18n';
import { isLocalParticipantModerator } from '../base/participants';
import { doGetJSON, parseURIString } from '../base/util';

declare var $: Function;
declare var interfaceConfig: Object;

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * Sends an ajax request to check if the phone number can be called.
 *
 * @param {string} dialNumber - The dial number to check for validity.
 * @param {string} dialOutAuthUrl - The endpoint to use for checking validity.
 * @returns {Promise} - The promise created by the request.
 */
export function checkDialNumber(
        dialNumber: string,
        dialOutAuthUrl: string
): Promise<Object> {
    const fullUrl = `${dialOutAuthUrl}?phone=${dialNumber}`;

    return new Promise((resolve, reject) => {
        $.getJSON(fullUrl)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Sends a GET request to obtain the conference ID necessary for identifying
 * which conference to join after diaing the dial-in service.
 *
 * @param {string} baseUrl - The url for obtaining the conference ID (pin) for
 * dialing into a conference.
 * @param {string} roomName - The conference name to find the associated
 * conference ID.
 * @param {string} mucURL - In which MUC the conference exists.
 * @returns {Promise} - The promise created by the request.
 */
export function getDialInConferenceID(
        baseUrl: string,
        roomName: string,
        mucURL: string
): Promise<Object> {

    const conferenceIDURL = `${baseUrl}?conference=${roomName}@${mucURL}`;

    return doGetJSON(conferenceIDURL);
}

/**
 * Sends a GET request for phone numbers used to dial into a conference.
 *
 * @param {string} url - The service that returns confernce dial-in numbers.
 * @returns {Promise} - The promise created by the request. The returned numbers
 * may be an array of numbers or an object with countries as keys and arrays of
 * phone number strings.
 */
export function getDialInNumbers(url: string): Promise<*> {
    return doGetJSON(url);
}

/**
 * Removes all non-numeric characters from a string.
 *
 * @param {string} text - The string from which to remove all characters except
 * numbers.
 * @returns {string} A string with only numbers.
 */
export function getDigitsOnly(text: string = ''): string {
    return text.replace(/\D/g, '');
}

/**
 * Type of the options to use when sending a search query.
 */
export type GetInviteResultsOptions = {

    /**
     * The endpoint to use for checking phone number validity.
     */
    dialOutAuthUrl: string,

    /**
     * Whether or not to search for people.
     */
    addPeopleEnabled: boolean,

    /**
     * Whether or not to check phone numbers.
     */
    dialOutEnabled: boolean,

    /**
     * Array with the query types that will be executed -
     * "conferenceRooms" | "user" | "room".
     */
    peopleSearchQueryTypes: Array<string>,

    /**
     * The url to query for people.
     */
    peopleSearchUrl: string,

    /**
     * The jwt token to pass to the search service.
     */
    jwt: string
};

/**
 * Combines directory search with phone number validation to produce a single
 * set of invite search results.
 *
 * @param {string} query - Text to search.
 * @param {GetInviteResultsOptions} options - Options to use when searching.
 * @returns {Promise<*>}
 */
export function getInviteResultsForQuery(
        query: string,
        options: GetInviteResultsOptions
): Promise<*> {

    const text = query.trim();

    const {
        dialOutAuthUrl,
        addPeopleEnabled,
        dialOutEnabled,
        peopleSearchQueryTypes,
        peopleSearchUrl,
        jwt
    } = options;

    let peopleSearchPromise;

    if (addPeopleEnabled && text) {
        peopleSearchPromise = searchDirectory(
            peopleSearchUrl,
            jwt,
            text,
            peopleSearchQueryTypes);
    } else {
        peopleSearchPromise = Promise.resolve([]);
    }


    let hasCountryCode = text.startsWith('+');
    let phoneNumberPromise;

    // Phone numbers are handled a specially to enable both cases of restricting
    // numbers to telephone number-y numbers and accepting any arbitrary string,
    // which may be valid for SIP (jigasi) calls. If the dialOutAuthUrl is
    // defined, then it is assumed the call is to a telephone number and
    // some validation of the number is completed, with the + sign used as a way
    // for the UI to detect and enforce the usage of a country code. If the
    // dialOutAuthUrl is not defined, accept anything because this is assumed
    // to be the SIP (jigasi) case.
    if (dialOutEnabled && dialOutAuthUrl && isMaybeAPhoneNumber(text)) {
        let numberToVerify = text;

        // When the number to verify does not start with a +, we assume no
        // proper country code has been entered. In such a case, prepend 1 for
        // the country code. The service currently takes care of prepending the
        // +.
        if (!hasCountryCode && !text.startsWith('1')) {
            numberToVerify = `1${numberToVerify}`;
        }

        // The validation service works properly when the query is digits only
        // so ensure only digits get sent.
        numberToVerify = getDigitsOnly(numberToVerify);

        phoneNumberPromise = checkDialNumber(numberToVerify, dialOutAuthUrl);
    } else if (dialOutEnabled && !dialOutAuthUrl) {
        // fake having a country code to hide the country code reminder
        hasCountryCode = true;

        // With no auth url, let's say the text is a valid number
        phoneNumberPromise = Promise.resolve({
            allow: true,
            country: '',
            phone: text
        });
    } else {
        phoneNumberPromise = Promise.resolve({});
    }

    return Promise.all([ peopleSearchPromise, phoneNumberPromise ])
        .then(([ peopleResults, phoneResults ]) => {
            const results = [
                ...peopleResults
            ];

            /**
             * This check for phone results is for the day the call to searching
             * people might return phone results as well. When that day comes
             * this check will make it so the server checks are honored and the
             * local appending of the number is not done. The local appending of
             * the phone number can then be cleaned up when convenient.
             */
            const hasPhoneResult
                = peopleResults.find(result => result.type === 'phone');

            if (!hasPhoneResult && typeof phoneResults.allow === 'boolean') {
                results.push({
                    allowed: phoneResults.allow,
                    country: phoneResults.country,
                    type: 'phone',
                    number: phoneResults.phone,
                    originalEntry: text,
                    showCountryCodeReminder: !hasCountryCode
                });
            }

            return results;
        });
}

/**
 * Helper for determining how many of each type of user is being invited. Used
 * for logging and sending analytics related to invites.
 *
 * @param {Array} inviteItems - An array with the invite items, as created in
 * {@link _parseQueryResults}.
 * @returns {Object} An object with keys as user types and values as the number
 * of invites for that type.
 */
export function getInviteTypeCounts(inviteItems: Array<Object> = []) {
    const inviteTypeCounts = {};

    inviteItems.forEach(({ type }) => {
        if (!inviteTypeCounts[type]) {
            inviteTypeCounts[type] = 0;
        }
        inviteTypeCounts[type]++;
    });

    return inviteTypeCounts;
}

/**
 * Sends a post request to an invite service.
 *
 * @param {string} inviteServiceUrl - The invite service that generates the
 * invitation.
 * @param {string} inviteUrl - The url to the conference.
 * @param {string} jwt - The jwt token to pass to the search service.
 * @param {Immutable.List} inviteItems - The list of the "user" or "room" type
 * items to invite.
 * @returns {Promise} - The promise created by the request.
 */
export function invitePeopleAndChatRooms( // eslint-disable-line max-params
        inviteServiceUrl: string,
        inviteUrl: string,
        jwt: string,
        inviteItems: Array<Object>
): Promise<void> {

    if (!inviteItems || inviteItems.length === 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        $.post(
                `${inviteServiceUrl}?token=${jwt}`,
                JSON.stringify({
                    'invited': inviteItems,
                    'url': inviteUrl
                }),
                resolve,
                'json')
            .fail((jqxhr, textStatus, error) => reject(error));
    });
}

/**
 * Determines if adding people is currently enabled.
 *
 * @param {boolean} state - Current state.
 * @returns {boolean} Indication of whether adding people is currently enabled.
 */
export function isAddPeopleEnabled(state: Object): boolean {
    const { isGuest } = state['features/base/jwt'];

    if (!isGuest) {
        // XXX The mobile/react-native app is capable of disabling the
        // adding/inviting of people in the current conference. Anyway, the
        // Web/React app does not have that capability so default appropriately.
        const addPeopleEnabled = getAppProp(state, 'addPeopleEnabled');

        return (
            (typeof addPeopleEnabled === 'undefined')
                || Boolean(addPeopleEnabled));
    }

    return false;
}

/**
 * Determines if dial out is currently enabled or not.
 *
 * @param {boolean} state - Current state.
 * @returns {boolean} Indication of whether dial out is currently enabled.
 */
export function isDialOutEnabled(state: Object): boolean {
    const { conference } = state['features/base/conference'];
    let dialOutEnabled = isLocalParticipantModerator(state)
        && conference
        && conference.isSIPCallingSupported();

    if (dialOutEnabled) {
        // XXX The mobile/react-native app is capable of disabling of dial-out.
        // Anyway, the Web/React app does not have that capability so default
        // appropriately.
        dialOutEnabled = getAppProp(state, 'dialOutEnabled');

        return (
            (typeof dialOutEnabled === 'undefined') || Boolean(dialOutEnabled));
    }

    return false;
}

/**
 * Checks whether a string looks like it could be for a phone number.
 *
 * @param {string} text - The text to check whether or not it could be a phone
 * number.
 * @private
 * @returns {boolean} True if the string looks like it could be a phone number.
 */
function isMaybeAPhoneNumber(text: string): boolean {
    if (!isPhoneNumberRegex().test(text)) {
        return false;
    }

    const digits = getDigitsOnly(text);

    return Boolean(digits.length);
}

/**
 * RegExp to use to determine if some text might be a phone number.
 *
 * @returns {RegExp}
 */
function isPhoneNumberRegex(): RegExp {
    let regexString = '^[0-9+()-\\s]*$';

    if (typeof interfaceConfig !== 'undefined') {
        regexString = interfaceConfig.PHONE_NUMBER_REGEX || regexString;
    }

    return new RegExp(regexString);
}

/**
 * Sends an ajax request to a directory service.
 *
 * @param {string} serviceUrl - The service to query.
 * @param {string} jwt - The jwt token to pass to the search service.
 * @param {string} text - Text to search.
 * @param {Array<string>} queryTypes - Array with the query types that will be
 * executed - "conferenceRooms" | "user" | "room".
 * @returns {Promise} - The promise created by the request.
 */
export function searchDirectory( // eslint-disable-line max-params
        serviceUrl: string,
        jwt: string,
        text: string,
        queryTypes: Array<string> = [ 'conferenceRooms', 'user', 'room' ]
): Promise<Array<Object>> {

    const query = encodeURIComponent(text);
    const queryTypesString = encodeURIComponent(JSON.stringify(queryTypes));

    return fetch(`${serviceUrl}?query=${query}&queryTypes=${
        queryTypesString}&jwt=${jwt}`)
            .then(response => {
                const jsonify = response.json();

                if (response.ok) {
                    return jsonify;
                }

                return jsonify
                    .then(result => Promise.reject(result));
            })
            .catch(error => {
                logger.error(
                    'Error searching directory:', error);

                return Promise.reject(error);
            });
}

/**
 * Returns descriptive text that can be used to invite participants to a meeting
 * (share via mobile or use it for calendar event description).
 *
 * @param {string} inviteUrl - The conference/location URL.
 * @param {boolean} includeDialInfo - Whether to include or not the dialing
 * information link.
 * @param {boolean} useHtml - Whether to return html text.
 * @returns {string}
 */
export function getShareInfoText(
        inviteUrl: string, includeDialInfo: boolean, useHtml: ?boolean) {
    let roomUrl = inviteUrl;

    if (useHtml) {
        roomUrl = `<a href="${roomUrl}">${roomUrl}</a>`;
    }

    let infoText = i18next.t('share.mainText', { roomUrl });

    if (includeDialInfo) {
        const { room } = parseURIString(inviteUrl);
        let dialInfoPageUrl = getDialInfoPageURL(room);

        if (useHtml) {
            dialInfoPageUrl
                = `<a href="${dialInfoPageUrl}">${dialInfoPageUrl}</a>`;
        }

        infoText += i18next.t('share.dialInfoText', { dialInfoPageUrl });
    }

    return infoText;
}

/**
 * Generates the URL for the static dial in info page.
 *
 * @param {string} conferenceName - The conference name.
 * @private
 * @returns {string}
 */
export function getDialInfoPageURL(conferenceName: string) {
    const origin = window.location.origin;
    const pathParts = window.location.pathname.split('/');

    pathParts.length = pathParts.length - 1;

    const newPath = pathParts.reduce((accumulator, currentValue) => {
        if (currentValue) {
            return `${accumulator}/${currentValue}`;
        }

        return accumulator;
    }, '');

    return `${origin}${newPath}/static/dialInInfo.html?room=${conferenceName}`;
}
