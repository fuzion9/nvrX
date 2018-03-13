let ss = require('socket.io-stream');
let db = require('../lib/db');
let log = require('../lib/logger');
let monitors = require('../lib/monitor');
let runner = require('../lib/monitorRunner');
module.exports = function (socket) {
    'use strict';
    //log.info('Socket Connect');
    socket.emit('init', {
        status: 'Connected'
    });

    socket.on('disconnect', function () {
        //log.info('Socket Disconnected');
    });

    socket.on('startStream', (data)=>{
        let monitor = monitors.getMonitorById(data.id);
        if (monitor.config.mode !== 'disabled') {
            log.info('\x1B[32mStart Live Stream:\x1B[39m ' + monitor.alias + '(' + data.id + ')');
            socket.join('STREAM_' + data.id);
        }
    });

    socket.on('stopStream', (data)=>{
        let monitor = monitors.getMonitorById(data.id);
        log.info('\x1B[33mStopping Live Stream:\x1B[39m ' + monitor.alias);
        socket.leave('STREAM_' + data.id);
    });

};
