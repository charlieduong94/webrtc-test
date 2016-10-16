'use strict';

const Signaler = require('src/Signaler');
const EventEmitter = require('events');
const logger = require('src/logger');

/**
 *  Creates an offer and sets the local description
 */
function _createOffer(peer, signaler) {
    logger.info('creating offer');
    return peer.createOffer()
        .then((desc) => {
            logger.info('setting local description');
            return peer.setLocalDescription(desc).then(() => {
                return desc;
            });
        });
}

/**
 *  Creates an answer, and sets the local description
 */
function _createAnswer(peer, signaler) {
    logger.info('creating answer');
    let desc;
    return peer.createAnswer()
        .then((answer) => {
            desc = answer;
            return peer.setLocalDescription(desc);
        })
        .then(() => {
            return desc;
        });
}

/**
 *  Adds a new RTCPeerConnection to the map of peers
 *
 *  TODO: Add option to create a data channel
 */
function _addPeer(connection, peerId) {
    let signaler = connection._signaler;

    // TODO: Allow users to specify their own ice servers,
    // for now this uses one of google's free stun servers
    let peer = connection._peer = new RTCPeerConnection({
        iceServers: [
            {
                url: 'stun:stun.l.google.com:19302'
            }
        ]
    });

    // add the local stream to the peer so that it can be streamed out
    peer.addStream(connection._localStream);

    // If an offer/answer trade was insufficient to create a connection or
    // meaningful response, this is triggered to start a renegotiation,
    // this is most commonly called right after the first offer

    peer.onnegotiationneeded = () => {
        logger.info('Negotiation needed');
        _createOffer(peer, signaler)
            .then((desc) => {
                signaler.emitTo(peerId, 'offer', desc);
            })
            .catch((err) => {
                logger.error(err);
            });
    };

    // after a successful negotiation, a data stream is added to the peer.
    //
    peer.onaddstream = (event) => {
        logger.info('Stream added');
        connection.emit('stream-added', URL.createObjectURL(event.stream));
    };

    // the peer connection is added to a pool of other connections in the room
    connection._peers[peerId] = peer;

    return peer;
}

/**
 * Prepares the signaling logic and joins a room.
 * This will immediately start trying to go through the negotiation process,
 * if another peer is found in the room
 */
function _joinRoom(self, room) {
    // don't allow for listeners to be bound twice
    // that would cause potential issues during negotiation
    if (self._listenersBound) {
        throw new Error('Connection has already started');
    }
    self._listenersBound = true;

    let signaler = self._signaler;
    let peers = self._peers;

    // new client has joined the room, create peer for connecting
    signaler.on('client-join', (senderId) => {
        let peer = peers[senderId];
        if (!peer) {
            logger.info('Client has joined');
            peer = _addPeer(self, senderId);
            _createOffer(peer, signaler)
                .then((desc) => {
                    return signaler.emitTo(senderId, 'offer', desc);
                })
                .catch((err) => {
                    logger.error(err);
                });
        }
    });

    // on an offer, add peer if peer has not been met before.
    // set the remote description and send back an answer,
    // Note: ice candidates cannot be handed until a remote description has been made,
    // that's why the peer's onicecandidate method is set afterwards
    signaler.on('offer', ({senderId, data}) => {
        let peer = self._peers[senderId];

        if (!peer) {
            peer = _addPeer(self, senderId);
        }

        logger.info('Received offer from ', senderId);
        let description = new RTCSessionDescription(data);
        peer.setRemoteDescription(description)
            .then(() => {
                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        signaler.emitTo(senderId, 'icecandidate', event.candidate);
                    }
                };
                return _createAnswer(peer, signaler);
            })
            .then((answer) => {
                return signaler.emitTo(senderId, 'answer', answer);
            })
            .catch((err) => {
                logger.error(err);
            });
    });

    // Once an answer has be received, set the session description,
    // if needed, the peer will trigger it's onnegotiationneeded method,
    // otherwise, if the answer is accepted, the connection will be made
    signaler.on('answer', ({senderId, data}) => {
        let peer = self._peers[senderId];

        if (!peer) {
            return;
        }

        logger.info('Received Answer, setting local description');

        let description = new RTCSessionDescription(data);

        peer.setRemoteDescription(description)
            .catch((err) => {
                logger.error(err);
            });
    });

    // if any icecandidates are received, add it to the peer connection for possible use
    signaler.on('icecandidate', ({senderId, data}) => {
        let peer = self._peers[senderId];

        if (!peer) {
            return;
        }

        let candidate = new RTCIceCandidate(data);
        peer.addIceCandidate(candidate)
            .catch((err) => {
                logger.error(err);
            });
    });


    // after setting up all of the listeners, emit the join event
    // to start interacting with other peers in the room (if any)
    return signaler.emit('join', room);
}

/**
 * The connection class that encapsulates all of the signaling and negotiation logic.
 */
class WebRTCConnection extends EventEmitter {
    constructor(localStream) {
        super();
        this._localStream = localStream;
        this._listenersBound = false;

        // store connections to other peers
        this._peers = {};

        // create a signaler to help send out messages to
        // other peers to negotiate a connection,
        // this signaler is just a simple wrapper around
        // a socket.io-client
        let signaler = this._signaler = new Signaler();

        // handle the connect, error, and disconnect events
        signaler.on('connect', (socket) => {
            logger.info('Signaler has connected');
            this.emit('ready');
        });

        signaler.on('error', (err) => {
            logger.error('err');
        });

        signaler.on('disconnect', () => {
            logger.warn('Signaler has disconnected');
        });

    }

    /**
     *  Creates a room and immediately joins it.
     */
    createRoom() {
        let signaler = this._signaler;
        return new Promise((resolve, reject) => {
            let onRoomCreated = (roomId) => {
                signaler.removeListener('roomCreated', onRoomCreated);
                _joinRoom(this, roomId).then(() => {
                    resolve(roomId);
                });
            };
            signaler.on('roomCreated', onRoomCreated);
            signaler.emit('create')
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Joins an existing room. See _joinRoom defined above.
     */
    join(roomId) {
        _joinRoom(this, roomId);
    }
}

module.exports = WebRTCConnection;
