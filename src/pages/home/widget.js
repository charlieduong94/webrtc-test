'use strict';
const logger = require('src/logger');

module.exports = require('marko-widgets').defineWidget({
    init: function() {
        logger.info('initialized widget');
    }
});
