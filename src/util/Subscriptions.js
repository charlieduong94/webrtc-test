'use strict';

class Subscriptions {
    constructor(context) {
        this._events = {};
        this._context = context;
    }

    on(eventName, cb) {
        this._context.on(eventName, cb);
        this._events[eventName] = cb;
    }

    removeAll() {
        Object.keys(this._events).forEach((eventName) => {
            this._context.removeListener(eventName, this._events[eventName]);
            delete this._events[eventName];
        });
    }
}

module.exports = Subscriptions;
