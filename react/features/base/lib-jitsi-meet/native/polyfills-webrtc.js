import {
    MediaStream,
    MediaStreamTrack,
    RTCSessionDescription,
    RTCIceCandidate,
    getUserMedia
} from 'react-native-webrtc';

import RTCPeerConnection from './RTCPeerConnection';

(global => {
    if (typeof global.webkitMediaStream === 'undefined') {
        global.webkitMediaStream = MediaStream;
    }
    if (typeof global.MediaStreamTrack === 'undefined') {
        global.MediaStreamTrack = MediaStreamTrack;
    }
    if (typeof global.RTCIceCandidate === 'undefined') {
        global.RTCIceCandidate = RTCIceCandidate;
    }
    if (typeof global.RTCPeerConnection === 'undefined') {
        global.RTCPeerConnection = RTCPeerConnection;
    }
    if (typeof global.webkitRTCPeerConnection === 'undefined') {
        global.webkitRTCPeerConnection = RTCPeerConnection;
    }
    if (typeof global.RTCSessionDescription === 'undefined') {
        global.RTCSessionDescription = RTCSessionDescription;
    }

    const navigator = global.navigator;

    if (navigator) {
        if (typeof navigator.webkitGetUserMedia === 'undefined') {
            navigator.webkitGetUserMedia = getUserMedia;
        }
    }

})(global || window || this); // eslint-disable-line no-invalid-this
