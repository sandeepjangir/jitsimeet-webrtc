// @flow

import Tabs from '@atlaskit/tabs';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Dialog, hideDialog } from '../../base/dialog';
import { translate } from '../../base/i18n';

import DesktopPickerPane from './DesktopPickerPane';
import { obtainDesktopSources } from '../functions';

/**
 * The size of the requested thumbnails.
 *
 * @type {Object}
 */
const THUMBNAIL_SIZE = {
    height: 300,
    width: 300
};

/**
 * The sources polling interval in ms.
 *
 * @type {int}
 */
const UPDATE_INTERVAL = 2000;

/**
 * The default selected tab.
 *
 * @type {string}
 */
const DEFAULT_TAB_TYPE = 'screen';

const TAB_LABELS = {
    screen: 'dialog.yourEntireScreen',
    window: 'dialog.applicationWindow'
};

const VALID_TYPES = Object.keys(TAB_LABELS);

/**
 * React component for DesktopPicker.
 *
 * @extends Component
 */
class DesktopPicker extends Component<*, *> {
    /**
     * DesktopPicker component's property types.
     *
     * @static
     */
    static propTypes = {

        /**
         * An array with desktop sharing sources to be displayed.
         */
        desktopSharingSources: PropTypes.arrayOf(PropTypes.string),

        /**
         * Used to request DesktopCapturerSources.
         */
        dispatch: PropTypes.func,

        /**
         * The callback to be invoked when the component is closed or when
         * a DesktopCapturerSource has been chosen.
         */
        onSourceChoose: PropTypes.func,

        /**
         * Used to obtain translations.
         */
        t: PropTypes.func
    };

    _poller = null;

    state = {
        selectedSource: {},
        sources: {},
        types: []
    };

    /**
     * Stores the type of the selected tab.
     *
     * @type {string}
     */
    _selectedTabType = DEFAULT_TAB_TYPE;

    /**
     * Initializes a new DesktopPicker instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onCloseModal = this._onCloseModal.bind(this);
        this._onPreviewClick = this._onPreviewClick.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._onTabSelected = this._onTabSelected.bind(this);
        this._updateSources = this._updateSources.bind(this);

        this.state.types
            = this._getValidTypes(this.props.desktopSharingSources);
    }

    /**
     * Starts polling.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        this._startPolling();
    }

    /**
     * Notifies this mounted React Component that it will receive new props.
     * Sets a default selected source if one is not already set.
     *
     * @inheritdoc
     * @param {Object} nextProps - The read-only React Component props that this
     * instance will receive.
     * @returns {void}
     */
    componentWillReceiveProps(nextProps) {
        const { desktopSharingSources } = nextProps;

        /**
         * Do only reference check in order to not calculate the types on every
         * update. This is enough for our use case and we don't need value
         * checking because if the value is the same we won't change the
         * reference for the desktopSharingSources array.
         */
        if (desktopSharingSources !== this.props.desktopSharingSources) {
            this.setState({
                types: this._getValidTypes(desktopSharingSources)
            });
        }
    }

    /**
     * Clean up component and DesktopCapturerSource store state.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._stopPolling();
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     */
    render() {
        return (
            <Dialog
                isModal = { false }
                okDisabled = { Boolean(!this.state.selectedSource.id) }
                okTitleKey = 'dialog.Share'
                onCancel = { this._onCloseModal }
                onSubmit = { this._onSubmit }
                titleKey = 'dialog.shareYourScreen'
                width = 'medium' >
                { this._renderTabs() }
            </Dialog>
        );
    }

    /**
     * Computates the selected source.
     *
     * @param {Object} sources - The available sources.
     * @returns {Object} The selectedSource value.
     */
    _getSelectedSource(sources = {}) {
        const { selectedSource } = this.state;

        /**
         * If there are no sources for this type (or no sources for any type)
         * we can't select anything.
         */
        if (!Array.isArray(sources[this._selectedTabType])
                || sources[this._selectedTabType].length <= 0) {
            return {};
        }

        /**
         * Select the first available source for this type in the following
         * scenarios:
         * 1) Nothing is yet selected.
         * 2) Tab change.
         * 3) The selected source is no longer available.
         */
        if (!selectedSource // scenario 1)
                || selectedSource.type !== this._selectedTabType // scenario 2)
                || !sources[this._selectedTabType].some( // scenario 3)
                        source => source.id === selectedSource.id)) {
            return {
                id: sources[this._selectedTabType][0].id,
                type: this._selectedTabType
            };
        }

        /**
         * For all other scenarios don't change the selection.
         */
        return selectedSource;
    }

    /**
     * Extracts only the valid types from the passed {@code types}.
     *
     * @param {Array<string>} types - The types to filter.
     * @returns {Array<string>} The filtered types.
     */
    _getValidTypes(types = []) {
        return types.filter(
            type => VALID_TYPES.includes(type));
    }

    _onCloseModal: (?string, string) => void;

    /**
     * Dispatches an action to hide the DesktopPicker and invokes the passed in
     * callback with a selectedSource, if any.
     *
     * @param {string} [id] - The id of the DesktopCapturerSource to pass into
     * the onSourceChoose callback.
     * @param {string} type - The type of the DesktopCapturerSource to pass into
     * the onSourceChoose callback.
     * @returns {void}
     */
    _onCloseModal(id = '', type) {
        this.props.onSourceChoose(id, type);
        this.props.dispatch(hideDialog());
    }

    _onPreviewClick: (string, string) => void;

    /**
     * Sets the currently selected DesktopCapturerSource.
     *
     * @param {string} id - The id of DesktopCapturerSource.
     * @param {string} type - The type of DesktopCapturerSource.
     * @returns {void}
     */
    _onPreviewClick(id, type) {
        this.setState({
            selectedSource: {
                id,
                type
            }
        });
    }

    _onSubmit: () => void;

    /**
     * Request to close the modal and execute callbacks with the selected source
     * id.
     *
     * @returns {void}
     */
    _onSubmit() {
        const { id, type } = this.state.selectedSource;

        this._onCloseModal(id, type);
    }

    _onTabSelected: () => void;

    /**
     * Stores the selected tab and updates the selected source via
     * {@code _getSelectedSource}.
     *
     * @param {int} idx - The index of the selected tab.
     * @returns {void}
     */
    _onTabSelected(idx) {
        const { types, sources } = this.state;

        this._selectedTabType = types[idx];
        this.setState({
            selectedSource: this._getSelectedSource(sources)
        });
    }

    /**
     * Configures and renders the tabs for display.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderTabs() {
        const { selectedSource, sources, types } = this.state;
        const { t } = this.props;
        const tabs
            = types.map(
                type => {
                    return {
                        content: <DesktopPickerPane
                            key = { type }
                            onClick = { this._onPreviewClick }
                            onDoubleClick = { this._onCloseModal }
                            selectedSourceId = { selectedSource.id }
                            sources = { sources[type] }
                            type = { type } />,
                        defaultSelected: type === DEFAULT_TAB_TYPE,
                        label: t(TAB_LABELS[type])
                    };
                });

        return (
            <Tabs
                onSelect = { this._onTabSelected }
                tabs = { tabs } />);
    }

    /**
     * Create an interval to update knwon available DesktopCapturerSources.
     *
     * @private
     * @returns {void}
     */
    _startPolling() {
        this._stopPolling();
        this._updateSources();
        this._poller = window.setInterval(this._updateSources, UPDATE_INTERVAL);
    }

    /**
     * Cancels the interval to update DesktopCapturerSources.
     *
     * @private
     * @returns {void}
     */
    _stopPolling() {
        window.clearInterval(this._poller);
        this._poller = null;
    }

    _updateSources: () => void;

    /**
     * Obtains the desktop sources and updates state with them.
     *
     * @private
     * @returns {void}
     */
    _updateSources() {
        const { types } = this.state;

        if (types.length > 0) {
            obtainDesktopSources(
                this.state.types,
                { thumbnailSize: THUMBNAIL_SIZE }
            )
            .then(sources => {
                const selectedSource = this._getSelectedSource(sources);

                // TODO: Maybe check if we have stopped the timer and unmounted
                // the component.
                this.setState({
                    sources,
                    selectedSource
                });
            })
            .catch(() => { /* ignore */ });
        }
    }
}

export default translate(connect()(DesktopPicker));
