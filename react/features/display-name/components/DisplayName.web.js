import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { appendSuffix } from '../functions';

import { translate } from '../../base/i18n';
import { participantDisplayNameChanged } from '../../base/participants';

/**
 * React {@code Component} for displaying and editing a participant's name.
 *
 * @extends Component
 */
class DisplayName extends Component {
    /**
     * {@code DisplayName}'s property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * Whether or not the display name should be editable on click.
         */
        allowEditing: PropTypes.bool,

        /**
         * Invoked to update the participant's display name.
         */
        dispatch: PropTypes.func,

        /**
         * The participant's current display name.
         */
        displayName: PropTypes.string,

        /**
         * A string to append to the displayName, if provided.
         */
        displayNameSuffix: PropTypes.string,

        /**
         * The ID attribute to add to the component. Useful for global querying
         * for the component by legacy components and torture tests.
         */
        elementID: PropTypes.string,

        /**
         * The ID of the participant whose name is being displayed.
         */
        participantID: PropTypes.string,

        /**
         * Invoked to obtain translated strings.
         */
        t: PropTypes.func
    };

    /**
     * Initializes a new {@code DisplayName} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
            /**
             * The current value of the display name in the edit field.
             *
             * @type {string}
             */
            editDisplayNameValue: '',

            /**
             * Whether or not the component should be displaying an editable
             * input.
             *
             * @type {boolean}
             */
            isEditing: false
        };

        /**
         * The internal reference to the HTML element backing the React
         * {@code Component} input with id {@code editDisplayName}. It is
         * necessary for automatically selecting the display name input field
         * when starting to edit the display name.
         *
         * @private
         * @type {HTMLInputElement}
         */
        this._nameInput = null;

        // Bind event handlers so they are only bound once for every instance.
        this._onChange = this._onChange.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onStartEditing = this._onStartEditing.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._setNameInputRef = this._setNameInputRef.bind(this);
    }

    /**
     * Automatically selects the input field's value after starting to edit the
     * display name.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidUpdate(previousProps, previousState) {
        if (!previousState.isEditing && this.state.isEditing) {
            this._nameInput.select();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            allowEditing,
            displayName,
            displayNameSuffix,
            elementID,
            t
        } = this.props;

        if (allowEditing && this.state.isEditing) {
            return (
                <input
                    autoFocus = { true }
                    className = 'editdisplayname'
                    id = 'editDisplayName'
                    onBlur = { this._onSubmit }
                    onChange = { this._onChange }
                    onKeyDown = { this._onKeyDown }
                    placeholder = { t('defaultNickname') }
                    ref = { this._setNameInputRef }
                    spellCheck = { 'false' }
                    type = 'text'
                    value = { this.state.editDisplayNameValue } />
            );
        }

        return (
            <span
                className = 'displayname'
                id = { elementID }
                onClick = { this._onStartEditing }>
                { `${appendSuffix(displayName, displayNameSuffix)}` }
            </span>
        );
    }

    /**
     * Updates the internal state of the display name entered into the edit
     * field.
     *
     * @param {Object} event - DOM Event for value change.
     * @private
     * @returns {void}
     */
    _onChange(event) {
        this.setState({
            editDisplayNameValue: event.target.value
        });
    }

    /**
     * Submits the editted display name update if the enter key is pressed.
     *
     * @param {Event} event - Key down event object.
     * @private
     * @returns {void}
     */
    _onKeyDown(event) {
        if (event.key === 'Enter') {
            this._onSubmit();
        }
    }

    /**
     * Updates the component to display an editable input field and sets the
     * initial value to the current display name.
     *
     * @private
     * @returns {void}
     */
    _onStartEditing() {
        if (this.props.allowEditing) {
            this.setState({
                isEditing: true,
                editDisplayNameValue: this.props.displayName || ''
            });
        }
    }

    /**
     * Dispatches an action to update the display name if any change has
     * occurred after editing. Clears any temporary state used to keep track
     * of pending display name changes and exits editing mode.
     *
     * @param {Event} event - Key down event object.
     * @private
     * @returns {void}
     */
    _onSubmit() {
        const { editDisplayNameValue } = this.state;
        const { dispatch, participantID } = this.props;

        dispatch(participantDisplayNameChanged(
            participantID, editDisplayNameValue));

        this.setState({
            isEditing: false,
            editDisplayNameValue: ''
        });

        this._nameInput = null;
    }

    /**
     * Sets the internal reference to the HTML element backing the React
     * {@code Component} input with id {@code editDisplayName}.
     *
     * @param {HTMLInputElement} element - The DOM/HTML element for this
     * {@code Component}'s input.
     * @private
     * @returns {void}
     */
    _setNameInputRef(element) {
        this._nameInput = element;
    }
}

export default translate(connect()(DisplayName));
