// @flow

import { AbstractHangupButton } from '../base/toolbox';
import type { AbstractButtonProps as Props } from '../base/toolbox';

const { api } = window.alwaysOnTop;

/**
 * Stateless hangup button for the Always-on-Top windows.
 */
export default class HangupButton extends AbstractHangupButton<Props, *> {

    accessibilityLabel = 'Hangup';

    /**
     * Helper function to perform the actual hangup action.
     *
     * @override
     * @protected
     * @returns {void}
     */
    _doHangup() {
        api.executeCommand('hangup');
        window.close();
    }
}
