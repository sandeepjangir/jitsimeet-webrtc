import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { translate } from '../../base/i18n';

/**
 * React {@code Component} for displaying connection statistics.
 *
 * @extends Component
 */
class ConnectionStatsTable extends Component {
    /**
     * {@code ConnectionStatsTable} component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * Statistics related to bandwidth.
         * {{
         *     download: Number,
         *     upload: Number
         * }}
         */
        bandwidth: PropTypes.object,

        /**
         * Statistics related to bitrate.
         * {{
         *     download: Number,
         *     upload: Number
         * }}
         */
        bitrate: PropTypes.object,

        /**
         * A message describing the connection quality.
         */
        connectionSummary: PropTypes.string,

        /**
         * The end-to-end round-trip-time.
         */
        e2eRtt: PropTypes.number,

        /**
         * Statistics related to frame rates for each ssrc.
         * {{
         *     [ ssrc ]: Number
         * }}
         */
        framerate: PropTypes.object,

        /**
         * Whether or not the statistics are for local video.
         */
        isLocalVideo: PropTypes.bool,

        /**
         * Callback to invoke when the show additional stats link is clicked.
         */
        onShowMore: PropTypes.func,

        /**
         * Statistics related to packet loss.
         * {{
         *     download: Number,
         *     upload: Number
         * }}
         */
        packetLoss: PropTypes.object,

        /**
         * The region.
         */
        region: PropTypes.string,

        /**
         * Statistics related to display resolutions for each ssrc.
         * {{
         *     [ ssrc ]: {
         *         height: Number,
         *         width: Number
         *     }
         * }}
         */
        resolution: PropTypes.object,

        /**
         * Whether or not additional stats about bandwidth and transport should
         * be displayed. Will not display even if true for remote participants.
         */
        shouldShowMore: PropTypes.bool,

        /**
         * Invoked to obtain translated strings.
         */
        t: PropTypes.func,

        /**
         * Statistics related to transports.
         */
        transport: PropTypes.array
    };

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isLocalVideo } = this.props;

        return (
            <div className = 'connection-info'>
                { this._renderStatistics() }
                { isLocalVideo ? this._renderShowMoreLink() : null }
                { isLocalVideo && this.props.shouldShowMore
                    ? this._renderAdditionalStats() : null }
            </div>
        );
    }

    /**
     * Creates a table as ReactElement that will display additional statistics
     * related to bandwidth and transport.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderAdditionalStats() {
        return (
            <table className = 'connection-info__container'>
                <tbody>
                    { this._renderBandwidth() }
                    { this._renderTransport() }
                </tbody>
            </table>
        );
    }

    /**
     * Creates a table row as a ReactElement for displaying bandwidth related
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderBandwidth() {
        const { download, upload } = this.props.bandwidth || {};

        return (
            <tr>
                <td>
                    { this.props.t('connectionindicator.bandwidth') }
                </td>
                <td>
                    <span className = 'connection-info__download'>
                        &darr;
                    </span>
                    { download ? `${download} Kbps` : 'N/A' }
                    <span className = 'connection-info__upload'>
                        &uarr;
                    </span>
                    { upload ? `${upload} Kbps` : 'N/A' }
                </td>
            </tr>
        );
    }

    /**
     * Creates a a table row as a ReactElement for displaying bitrate related
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderBitrate() {
        const { download, upload } = this.props.bitrate || {};

        return (
            <tr>
                <td>
                    <span>
                        { this.props.t('connectionindicator.bitrate') }
                    </span>
                </td>
                <td>
                    <span className = 'connection-info__download'>
                        &darr;
                    </span>
                    { download ? `${download} Kbps` : 'N/A' }
                    <span className = 'connection-info__upload'>
                        &uarr;
                    </span>
                    { upload ? `${upload} Kbps` : 'N/A' }
                </td>
            </tr>
        );
    }

    /**
     * Creates a table row as a ReactElement for displaying a summary message
     * about the current connection status.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderConnectionSummary() {
        return (
            <tr className = 'connection-info__status'>
                <td>
                    <span>{ this.props.t('connectionindicator.status') }</span>
                </td>
                <td>{ this.props.connectionSummary }</td>
            </tr>
        );
    }

    /**
     * Creates a table row as a ReactElement for displaying end-to-end RTT and
     * the region.
     *
     * @returns {ReactElement}
     * @private
     */
    _renderE2eRtt() {
        const { e2eRtt, region, t } = this.props;
        let str = e2eRtt ? `${e2eRtt.toFixed(0)}ms` : 'N/A';

        if (region) {
            str += ` (${region})`;
        }

        return (
            <tr>
                <td>
                    <span>{ t('connectionindicator.e2e_rtt') }</span>
                </td>
                <td>{ str }</td>
            </tr>
        );
    }

    /**
     * Creates a table row as a ReactElement for displaying frame rate related
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderFrameRate() {
        const { framerate, t } = this.props;
        const frameRateString = Object.keys(framerate || {})
            .map(ssrc => framerate[ssrc])
            .join(', ') || 'N/A';

        return (
            <tr>
                <td>
                    <span>{ t('connectionindicator.framerate') }</span>
                </td>
                <td>{ frameRateString }</td>
            </tr>
        );
    }

    /**
     * Creates a tables row as a ReactElement for displaying packet loss related
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderPacketLoss() {
        const { packetLoss, t } = this.props;
        let packetLossTableData;

        if (packetLoss) {
            const { download, upload } = packetLoss;

            packetLossTableData = (
                <td>
                    <span className = 'connection-info__download'>
                        &darr;
                    </span>
                    { download === null ? 'N/A' : `${download}%` }
                    <span className = 'connection-info__upload'>
                        &uarr;
                    </span>
                    { upload === null ? 'N/A' : `${upload}%` }
                </td>
            );
        } else {
            packetLossTableData = <td>N/A</td>;
        }

        return (
            <tr>
                <td>
                    <span>
                        { t('connectionindicator.packetloss') }
                    </span>
                </td>
                { packetLossTableData }
            </tr>
        );
    }

    /**
     * Creates a table row as a ReactElement for displaying resolution related
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderResolution() {
        const { resolution, t } = this.props;
        const resolutionString = Object.keys(resolution || {})
            .map(ssrc => {
                const { width, height } = resolution[ssrc];

                return `${width}x${height}`;
            })
            .join(', ') || 'N/A';

        return (
            <tr>
                <td>
                    <span>{ t('connectionindicator.resolution') }</span>
                </td>
                <td>{ resolutionString }</td>
            </tr>
        );
    }

    /**
     * Creates a ReactElement for display a link to toggle showing additional
     * statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderShowMoreLink() {
        const translationKey
            = this.props.shouldShowMore
                ? 'connectionindicator.less'
                : 'connectionindicator.more';

        return (
            <a
                className = 'showmore link'
                onClick = { this.props.onShowMore } >
                { this.props.t(translationKey) }
            </a>
        );
    }

    /**
     * Creates a table as a ReactElement for displaying connection statistics.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderStatistics() {
        const isRemoteVideo = !this.props.isLocalVideo;

        return (
            <table className = 'connection-info__container'>
                <tbody>
                    { this._renderConnectionSummary() }
                    { this._renderBitrate() }
                    { this._renderPacketLoss() }
                    { isRemoteVideo ? this._renderE2eRtt() : null }
                    { this._renderResolution() }
                    { this._renderFrameRate() }
                </tbody>
            </table>
        );
    }

    /**
     * Creates table rows as ReactElements for displaying transport related
     * statistics.
     *
     * @private
     * @returns {ReactElement[]}
     */
    _renderTransport() {
        const { t, transport } = this.props;

        if (!transport || transport.length === 0) {
            const NA = (
                <tr key = 'address'>
                    <td>
                        <span>{ t('connectionindicator.address') }</span>
                    </td>
                    <td>
                        N/A
                    </td>
                </tr>
            );

            return [ NA ];
        }

        const data = {
            localIP: [],
            localPort: [],
            remoteIP: [],
            remotePort: [],
            transportType: []
        };

        for (let i = 0; i < transport.length; i++) {
            const ip = getIP(transport[i].ip);
            const localIP = getIP(transport[i].localip);
            const localPort = getPort(transport[i].localip);
            const port = getPort(transport[i].ip);

            if (!data.remoteIP.includes(ip)) {
                data.remoteIP.push(ip);
            }

            if (!data.localIP.includes(localIP)) {
                data.localIP.push(localIP);
            }

            if (!data.localPort.includes(localPort)) {
                data.localPort.push(localPort);
            }

            if (!data.remotePort.includes(port)) {
                data.remotePort.push(port);
            }

            if (!data.transportType.includes(transport[i].type)) {
                data.transportType.push(transport[i].type);
            }
        }

        // All of the transports should be either P2P or JVB
        let isP2P = false, isTURN = false;

        if (transport.length) {
            isP2P = transport[0].p2p;
            isTURN = transport[0].localCandidateType === 'relay'
                || transport[0].remoteCandidateType === 'relay';
        }

        let additionalData = null;

        if (isP2P) {
            additionalData = isTURN
                ? <span>{ t('connectionindicator.turn') }</span>
                : <span>{ t('connectionindicator.peer_to_peer') }</span>;
        }

        // First show remote statistics, then local, and then transport type.
        const tableRowConfigurations = [
            {
                additionalData,
                data: data.remoteIP,
                key: 'remoteaddress',
                label: t('connectionindicator.remoteaddress',
                    { count: data.remoteIP.length })
            },
            {
                data: data.remotePort,
                key: 'remoteport',
                label: t('connectionindicator.remoteport',
                        { count: transport.length })
            },
            {
                data: data.localIP,
                key: 'localaddress',
                label: t('connectionindicator.localaddress',
                    { count: data.localIP.length })
            },
            {
                data: data.localPort,
                key: 'localport',
                label: t('connectionindicator.localport',
                    { count: transport.length })
            },
            {
                data: data.transportType,
                key: 'transport',
                label: t('connectionindicator.transport',
                    { count: data.transportType.length })
            }
        ];

        return tableRowConfigurations.map(this._renderTransportTableRow);
    }

    /**
     * Creates a table row as a ReactElement for displaying a transport related
     * statistic.
     *
     * @param {Object} config - Describes the contents of the row.
     * @param {ReactElement} config.additionalData - Extra data to display next
     * to the passed in config.data.
     * @param {Array} config.data - The transport statistics to display.
     * @param {string} config.key - The ReactElement's key. Must be unique for
     * iterating over multiple child rows.
     * @param {string} config.label - The text to display describing the data.
     * @private
     * @returns {ReactElement}
     */
    _renderTransportTableRow(config) {
        const { additionalData, data, key, label } = config;

        return (
            <tr key = { key }>
                <td>
                    <span>
                        { label }
                    </span>
                </td>
                <td>
                    { getStringFromArray(data) }
                    { additionalData || null }
                </td>
            </tr>
        );
    }
}

/**
 * Utility for getting the IP from a transport statistics object's
 * representation of an IP.
 *
 * @param {string} value - The transport's IP to parse.
 * @private
 * @returns {string}
 */
function getIP(value) {
    if (!value) {
        return '';
    }

    return value.substring(0, value.lastIndexOf(':'));
}

/**
 * Utility for getting the port from a transport statistics object's
 * representation of an IP.
 *
 * @param {string} value - The transport's IP to parse.
 * @private
 * @returns {string}
 */
function getPort(value) {
    if (!value) {
        return '';
    }

    return value.substring(value.lastIndexOf(':') + 1, value.length);
}

/**
 * Utility for concatenating values in an array into a comma separated string.
 *
 * @param {Array} array - Transport statistics to concatenate.
 * @private
 * @returns {string}
 */
function getStringFromArray(array) {
    let res = '';

    for (let i = 0; i < array.length; i++) {
        res += (i === 0 ? '' : ', ') + array[i];
    }

    return res;
}

export default translate(ConnectionStatsTable);
