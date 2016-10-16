'use strict';

require('app-module-path').addPath(__dirname);
require('marko/node-require').install();
require('lasso/node-require-no-op').enable('.less', '.css');
require('marko/browser-refresh').enable();
require('lasso/browser-refresh').enable('*.marko *.css *.less');

const fs = require('fs');
const https = require('https');
const express = require('express');
const compression = require('compression');
const serveStatic = require('serve-static');
const logger = require('src/logger');

let httpsOptions = {
    key: fs.readFileSync('ssl/server-key.pem'),
    cert: fs.readFileSync('ssl/server-cert.pem')
};

let isProduction = process.env.node_env === 'production';
let port = process.env.PORT || 8000;

require('lasso').configure({
    plugins: [
        'lasso-marko',
        'lasso-less',
        'lasso-autoprefixer'
    ],
    require: {
        transforms: [
            {
                transform: 'lasso-babel-transform',
                config: {
                    extensions: ['.js']
                }
            }
        ]
    },
    outputDir: __dirname + '/static',
    minify: isProduction,
    fingerprintsEnabled: isProduction
});

let app = express();

app.use(compression());

app.use('/static', serveStatic(__dirname + '/static'));

app.get('/', require('src/pages/home'));

https.createServer(httpsOptions, app).listen(port, () => {
    logger.info(`Server is listening on port ${port}`);
});
