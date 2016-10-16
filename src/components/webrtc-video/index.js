'use strict';
require('./styles.less');

const WebRTCConnection = require('src/WebRTCConnection');

function _createVideo(component, streamUrl) {
    let videos = component.state.videos;
    videos.push({
        src: streamUrl
    });

    component.setStateDirty('videos', videos);
}

function _bindConnectionListeners(self, connection) {
    self.connection = connection;

    connection.on('ready', (url) => {
        let localVideo = self.getEl('video-local');
        localVideo.src = URL.createObjectURL(self.localStream);
        localVideo.play();
    });

    connection.on('stream-added', (url) => {
        _createVideo(self, url);
    });
}

module.exports = require('marko-widgets').defineComponent({
    template: require('./template'),

    init() {
        this.setState('videos', []);

        this.localStream = null;
        this.connection = null;

        let getUserMedia = navigator.mediaDevices.getUserMedia;
        getUserMedia({video: true, audio: true})
            .then((mediaStream) => {
                this.localStream = mediaStream;
                let connection = this.connection = new WebRTCConnection(this.localStream);
                _bindConnectionListeners(this, connection);
            });
    },

    getInitialState(input) {
        return {
            videos: input.videos
        };
    },

    handleJoinClick() {
        if (this.connection) {
            this.connection.join('room4');
        }
    }
});
