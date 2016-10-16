'use strict';

const socketIo = require('socket.io-client');
const SIGNAL_MASTER_URL = 'https://localhost:8888';

// A simple wrapper around the socket.io client
class Signaler {
    constructor(url) {
        // TODO: allow url to be passed in through the WebRTCConnection's constructor
        this._socket = socketIo(SIGNAL_MASTER_URL);
    }

    get readyState() {
        return this._readyState;
    }

    getId() {
        return this._socket.id;
    }

    on(event, fn) {
        this._socket.on(event, fn);
    }

    removeListener(event, fn) {
        this._socket.removeListener(event, fn);
    }

    emit(event, data) {
        return this._socket.emit(event, {
            senderId: this._socket.id,
            data
        });
    }

    emitTo(receiverId, event, data) {
        return this._socket.emit(event, {
            senderId: this._socket.id,
            receiverId,
            data
        });
    }

    disconnect() {
        this._socket.disconnect();
    }
}

module.exports = Signaler;
