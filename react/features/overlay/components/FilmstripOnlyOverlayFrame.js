import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
    Avatar,
    getAvatarURL,
    getLocalParticipant
} from '../../base/participants';

import OverlayFrame from './OverlayFrame';

/**
 * Implements a React Component for the frame of the overlays in filmstrip only
 * mode.
 */
class FilmstripOnlyOverlayFrame extends Component {
    /**
     * FilmstripOnlyOverlayFrame component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * The source (e.g. URI, URL) of the avatar image of the local
         * participant.
         *
         * @private
         */
        _avatar: PropTypes.string,

        /**
         * The children components to be displayed into the overlay frame for
         * filmstrip only mode.
         *
         * @type {ReactElement}
         */
        children: PropTypes.node.isRequired,

        /**
         * The css class name for the icon that will be displayed over the
         * avatar.
         *
         * @type {string}
         */
        icon: PropTypes.string,

        /**
         * Indicates the css style of the overlay. If true, then lighter;
         * darker, otherwise.
         *
         * @type {boolean}
         */
        isLightOverlay: PropTypes.bool
    };

    /**
     * Renders content related to the icon.
     *
     * @returns {ReactElement|null}
     * @private
     */
    _renderIcon() {
        if (!this.props.icon) {
            return null;
        }

        const iconClass = `inlay-filmstrip-only__icon ${this.props.icon}`;
        const iconBGClass = 'inlay-filmstrip-only__icon-background';

        return (
            <div>
                <div className = { iconBGClass } />
                <div className = 'inlay-filmstrip-only__icon-container'>
                    <span className = { iconClass } />
                </div>
            </div>
        );
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        return (
            <OverlayFrame isLightOverlay = { this.props.isLightOverlay }>
                <div className = 'inlay-filmstrip-only'>
                    <div className = 'inlay-filmstrip-only__content'>
                        {
                            this.props.children
                        }
                    </div>
                    <div className = 'inlay-filmstrip-only__avatar-container'>
                        <Avatar uri = { this.props._avatar } />
                        {
                            this._renderIcon()
                        }
                    </div>
                </div>
            </OverlayFrame>
        );
    }
}

/**
 * Maps (parts of) the Redux state to the associated FilmstripOnlyOverlayFrame
 * props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _avatar: string
 * }}
 */
function _mapStateToProps(state) {
    return {
        _avatar: getAvatarURL(getLocalParticipant(state) || {})
    };
}

export default connect(_mapStateToProps)(FilmstripOnlyOverlayFrame);
