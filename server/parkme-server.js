'use strict';

/*
 * Start the web server here. We are using the cluster module so we can leverage the power of multiple cores.
 */
const cluster = require('cluster'),
    path = require('path');

if (cluster.isMaster) {
    /*
     * If the current process is the parent (cluster master), lets just start a couple of workers here
     */
    const workers = require('os').cpus().length;

    for (let i = 0; i < workers; i++) {
        cluster.fork();
    }
} else {
    /*
     * As a worker, lets load the required modules and setup the web server.
     * We are using express as our core framework for the web server (https://www.npmjs.com/package/express)
     */
    const express = require('express'),
        serveStatic = require('serve-static'),
        parkRouter = require('./parkme-router');

    const expressApplication = express();

    const bodyParser = require('body-parser');

    /*
     * Here we are initializing routing rules and static file serving
     */
    expressApplication.use(bodyParser.json());
    expressApplication.use(serveStatic(path.join(__dirname, '..', 'client')));
    expressApplication.use('/departures', parkRouter);

    expressApplication.listen(process.env['PORT'] || 1337);

    console.log('worker started');
}
