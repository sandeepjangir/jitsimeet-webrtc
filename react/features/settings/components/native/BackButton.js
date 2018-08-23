// @flow

import React, { Component } from 'react';
import { TouchableOpacity } from 'react-native';

import { Icon } from '../../../base/font-icons';
import { Header } from '../../../base/react';

/**
 * The type of the React {@code Component} props of {@link BackButton}
 */
type Props = {

    /**
     * The action to be performed when the button is pressed.
     */
    onPress: Function,

    /**
     * An external style object passed to the component.
     */
    style?: Object
};

/**
 * A component rendering a back button.
 */
export default class BackButton extends Component<Props> {
    /**
     * Implements React's {@link Component#render()}, renders the button.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        return (
            <TouchableOpacity
                accessibilityLabel = { 'Back' }
                onPress = { this.props.onPress }>
                <Icon
                    name = { 'arrow_back' }
                    style = { [
                        Header.buttonStyle,
                        this.props.style
                    ] } />
            </TouchableOpacity>
        );
    }
}
