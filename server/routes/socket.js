let execSync = require('child_process').execSync;
let ss = require('socket.io-stream');
let db = require('../lib/db');
let log = require('../lib/logger');
let monitors = require('../lib/monitor');
let runner = require('../lib/monitorRunner');
let os = require('os');
let runningStreams = [];
let statsInterval;
module.exports = function (socket) {
    'use strict';
    //log.info('Socket Connect');
    socket.emit('init', {
        status: 'Connected'
    });

    socket.on('disconnect', function () {
        for (let i = 0; i < runningStreams.length; i++){
            log.info('Stopping ' + runningStreams[i] + ' due to socket disconnect');
            socket.leave('STREAM_' + runningStreams[i]);
        }
    });

    socket.on('startStream', (data)=>{
        let monitor = monitors.getMonitorById(data.id);
        if (monitor.config.mode !== 'disabled') {
            log.info('\x1B[32mStart Live Stream:\x1B[39m ' + monitor.alias + '(' + data.id + ')');
            runningStreams.push(data.id);
            socket.join('STREAM_' + data.id);
        }
    });

    socket.on('stopStream', (data)=>{
        let monitor = monitors.getMonitorById(data.id);
        log.info('\x1B[33mStopping Live Stream:\x1B[39m ' + monitor.alias);
        socket.leave('STREAM_' + data.id);
    });

    socket.on('systemStats', ()=>{
        getSystemStats((stats)=>{
            socket.emit('systemStats', stats);
        });
        statsInterval = setInterval(()=>{
            getSystemStats((stats)=>{
                socket.emit('systemStats', stats);
            });
        }, 5000);
    });

};

function getSystemStats(next){
    let stats = {
        totalMem: getReadableFileSizeString(os.totalmem()),
        freeMem: getAvailableMemory(),
        loadAvg: os.loadavg(),
        cpuPercent: getCPUStats()
    };
    next(stats);
}

function getAvailableMemory(){
    if (os.platform() === 'win32'){
        return getReadableFileSizeString(os.freemem());
    } else {
        return getReadableFileSizeString(parseInt(execSync("cat /proc/meminfo | grep MemAvailable | awk '{ print $2 }'")));
    }
}

function getCPUStats(){
    let cpuStat = {};
    if (os.platform() === 'win32'){
        cpuStat.raw = execSync('wmic cpu get loadpercentage /value');
        cpuStat.raw = cpuStat.raw.toString().split('=')[1];
        cpuStat.raw = cpuStat.raw.split('\r')[0];
    } else {
        //cpuStat.raw = execSync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'");
        //cpuStat.raw = Math.round(cpuStat.raw);

        cpuStat.raw = execSync("top -d 0.5 -b -n2 | grep \"Cpu(s)\"|tail -n 1 | awk '{print $2 + $4}'");
    }
    //console.log(cpuStat.raw);
    return cpuStat.raw;
}

function getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

