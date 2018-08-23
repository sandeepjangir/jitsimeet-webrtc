/**
 * The type of the Redux action which signals that the prompt for media
 * permission is visible or not.
 *
 * {
 *     type: MEDIA_PERMISSION_PROMPT_VISIBILITY_CHANGED,
 *     isVisible: {boolean},
 *     browser: {string}
 * }
 * @public
 */
export const MEDIA_PERMISSION_PROMPT_VISIBILITY_CHANGED
    = Symbol('MEDIA_PERMISSION_PROMPT_VISIBILITY_CHANGED');

/**
 * The type of the Redux action which signals that a suspend was detected.
 *
 * {
 *     type: SUSPEND_DETECTED
 * }
 * @public
 */
export const SUSPEND_DETECTED = Symbol('SUSPEND_DETECTED');

/**
 * Adjust the state of the fatal error which shows/hides the reload screen. See
 * action methods's description for more info about each of the fields.
 *
 * {
 *     type: SET_FATAL_ERROR,
 *     fatalError: ?Object
 * }
 * @public
 */
export const SET_FATAL_ERROR = Symbol('SET_FATAL_ERROR');
