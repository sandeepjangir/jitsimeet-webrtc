/* @flow */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { View } from 'react-native';
import { connect } from 'react-redux';

import { VideoTrack } from '../../base/media';
import { TintedView } from '../../base/react';
import { getLocalVideoTrack } from '../../base/tracks';

import styles from './styles';

/**
 * Implements a React {@code Component} which underlays the local video track,
 * if any, underneath its children.
 */
class LocalVideoTrackUnderlay extends Component<*, *> {
    state: {

        /**
         * The style of {@code LocalVideoTrackUnderlay} which is a combination
         * of its default style and the consumer-specified style.
         */
        style: Object
    };

    /**
     * {@code LocalVideoTrackUnderlay}'s React {@code Component} prop types.
     *
     * @static
     */
    static propTypes = {
        _localVideoTrack: PropTypes.object,
        children: PropTypes.node,
        style: PropTypes.object
    };

    /**
     * Initializes a new {@code LocalVideoTrackUnderlay} instance.
     *
     * @param {Object} props - The read-only React {@code Component} props with
     * which the new instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.componentWillReceiveProps(props);
    }

    /**
     * Notifies this mounted React {@code Component} that it will receive new
     * props. Forks (in Facebook/React speak) the prop {@code style} because its
     * value is to be combined with the default style.
     *
     * @inheritdoc
     * @param {Object} nextProps - The read-only React {@code Component} props
     * that this instance will receive.
     * @returns {void}
     */
    componentWillReceiveProps(nextProps) {
        // style
        const prevStyle = this.props && this.props.style;
        const nextStyle = nextProps && nextProps.style;
        const assignState = !this.state;

        if (prevStyle !== nextStyle || assignState) {
            const nextState = {
                style: {
                    ...styles.localVideoTrackUnderlay,
                    ...nextStyle
                }
            };

            if (assignState) {
                // eslint-disable-next-line react/no-direct-mutation-state
                this.state = nextState;
            } else {
                this.setState(nextState);
            }
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @override
     * @returns {ReactElement}
     */
    render() {
        return (
            <View style = { this.state.style }>
                <VideoTrack videoTrack = { this.props._localVideoTrack } />
                <TintedView>
                    { this.props.children }
                </TintedView>
            </View>
        );
    }
}

/**
 * Maps (parts of) the redux state to the React {@code Component} props of
 * {@code LocalVideoTrackUnderlay}.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {{
 *     _localVideoTrack: (Track|undefined)
 * }}
 */
function _mapStateToProps(state) {
    return {
        _localVideoTrack: getLocalVideoTrack(state['features/base/tracks'])
    };
}

export default connect(_mapStateToProps)(LocalVideoTrackUnderlay);
