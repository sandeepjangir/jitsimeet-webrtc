import React from 'react';
import { connect } from 'react-redux';

import { translate } from '../../base/i18n';

import AbstractPageReloadOverlay, { abstractMapStateToProps }
    from './AbstractPageReloadOverlay';
import OverlayFrame from './OverlayFrame';

/**
 * Implements a React Component for page reload overlay. Shown before the
 * conference is reloaded. Shows a warning message and counts down towards the
 * reload.
 */
class PageReloadOverlay extends AbstractPageReloadOverlay {
    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isNetworkFailure, t } = this.props;
        const { message, timeLeft, title } = this.state;

        return (
            <OverlayFrame isLightOverlay = { isNetworkFailure }>
                <div className = 'inlay'>
                    <span
                        className = 'reload_overlay_title'>
                        { t(title) }
                    </span>
                    <span className = 'reload_overlay_text'>
                        { t(message, { seconds: timeLeft }) }
                    </span>
                    { this._renderProgressBar() }
                    { this._renderButton() }
                </div>
            </OverlayFrame>
        );
    }
}

export default translate(connect(abstractMapStateToProps)(PageReloadOverlay));
