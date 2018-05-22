let exec = require('child_process').exec;
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
        log.info('Stopping all streams due to socket disconnect');
        for (let i = 0; i < runningStreams.length; i++){
            log.info('Stopping ' + runningStreams[i]);
            socket.leave('STREAM_' + runningStreams[i]);
            runningStreams = [];
            clearInterval(statsInterval);
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
    let stats = {};
    stats.totalMem = getReadableFileSizeString(os.totalmem());
    stats.loadAvg = os.loadavg();
    getAvailableMemory((m)=>{
        stats.freeMem = m;
        getCPUStats((c)=>{
            stats.cpuPercent = c;
            getDiskSpace((disk)=>{
                stats.disk = disk;
                next(stats);
            });
        });
    });
}



function getDiskSpace(next){
    let disk = [];
    if (os.platform() === 'win32'){
        exec('wmic logicaldisk get size,freespace,caption /value /format:csv', (error, stdout, stderr)=>{
            stdout = stdout.replace(/\r/g, '');
            let r = stdout.split('\n');
            for (let i =0; i < r.length; i++){
                if (r[i] !== ''){
                    let d = r[i].split(',');
                    if (d[2] !== '' && d[1] !== 'Caption'){

                        let pct = ((parseInt(d[2]) / parseInt(d[3])) * 100).toFixed(1);
                        disk.push({volume: d[1], totalSpace: getReadableFileSizeString(d[3]), freeSpace: getReadableFileSizeString(d[2]), freePercent: pct});
                    }
                }
            }
            next(disk);
        });
    } else {
        let vol = '/';
        //df  -k /tmp | tail -1 | awk '{print $3, $4}' //total, free
        exec('df -h '+vol+' | tail -1 | awk \'{print $2, $3, $4, $5}\'', (error, stdout, stderr)=>{
            stdout = stdout.replace(/\n/g, '');
            let r = stdout.split(' ');
            disk.push({volume: vol, totalSpace: r[0], freeSpace: r[2], freePercent: 100-(r[3].replace('%',''))});
            next(disk);
        });

    }

}



function getAvailableMemory(next){
    if (os.platform() === 'win32'){
        next(getReadableFileSizeString(os.freemem()));
    } else {
        exec('cat /proc/meminfo | grep MemAvailable | awk \'{ print $2 }\'', (error, stdout, stderr)=>{
            next(getReadableFileSizeString(parseInt(stdout)));
        });
    }
}

function getCPUStats(next){
    let cpuStat = {};
    if (os.platform() === 'win32'){
        cpuStat.raw = exec('wmic cpu get loadpercentage /value', (error, stdout, stderr)=>{
            cpuStat.raw = stdout;
            cpuStat.raw = cpuStat.raw.toString().split('=')[1];
            cpuStat.raw = cpuStat.raw.split('\r')[0];
            next(cpuStat.raw);
        });
    } else {
        exec('top -d 0.5 -b -n2 | grep "Cpu(s)"|tail -n 1 | awk \'{print $2 + $4}\'', (error, stdout, stderr)=>{
            next(stdout.toString());
        });

    }
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

