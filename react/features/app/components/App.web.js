// @flow

import { AtlasKitThemeProvider } from '@atlaskit/theme';
import React from 'react';

import '../../base/responsive-ui';
import '../../chat';
import '../../room-lock';
import '../../video-layout';

import { AbstractApp } from './AbstractApp';

/**
 * Root app {@code Component} on Web/React.
 *
 * @extends AbstractApp
 */
export class App extends AbstractApp {
    /**
     * Gets a Location object from the window with information about the current
     * location of the document.
     *
     * @inheritdoc
     */
    getWindowLocation() {
        return window.location;
    }

    /**
     * Overrides the parent method to inject {@link AtlasKitThemeProvider} as
     * the top most component.
     *
     * @override
     */
    _createMainElement(component, props) {
        return (
            <AtlasKitThemeProvider mode = 'dark'>
                { super._createMainElement(component, props) }
            </AtlasKitThemeProvider>
        );
    }
}
