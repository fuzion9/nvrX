let path = require('path');
let async = require('async');
let monitors = require('../lib/monitor');
let log = require('../lib/logger');
let spawn = require('child_process').spawn;
let execSync = require('child_process').execSync;
let db = require('../lib/db');
let fs = require('fs');
let motionDetect = require('../lib/motionDetect');
let runningMonitors = {};



let self = module.exports = {
    updateMotionValues:(id,motionConfig)=>{
        runningMonitors[id].config.motionConfig = motionConfig;
    },
    getMonitor: (id)=>{
        return runningMonitors[id];
    },
    restartMonitor: (id, next)=>{
        monitors.getAllMonitors(()=>{
            self.stopMonitor(id, ()=>{
                self.startMonitor(id, ()=>{
                    next();
                });
            });
        });
    },
    stopMonitor: (id, next)=>{
        if (runningMonitors[id] && runningMonitors[id].process && runningMonitors[id].process.pid) {
            fs.exists(runningMonitors[id].config.motionConfig.calculatedSnapShotLocation, (exists)=>{
                if (exists) fs.unlink(runningMonitors[id].config.motionConfig.calculatedSnapShotLocation, ()=>{});
            });
            log.info('Stopping Monitor: ' + id);
            try {
                runningMonitors[id].process.stdin.write('q');
                setTimeout(() => {
                    runningMonitors[id].process.kill('SIGINT');
                }, 1000);
            } catch (e) {
                log.error('Could not quit process, sending SIGTERM');
                runningMonitors[id].process.kill('SIGTERM');
            }
        } else {
            log.info('Not Stopping Monitor, it does not appear to be running: ' + id);
        }
        setTimeout(()=>{
            next();
        }, 1000);

    },
    startAllMonitors: (monitors, next)=>{
        log.info('Found ' + monitors.length + ' monitors to start');
        async.eachSeries(monitors, (monitor, cb) => {
            //log.info('Starting ' + monitor.alias);
            self.startMonitor(monitor, () => {
                cb();
            });
        }, () => {
            next();
        });
    },
    stopAllMonitors: (next)=>{
        async.eachSeries(runningMonitors, (monitor, cb)=>{
            log.debug('Killing ffmpeg process for ' + monitor.alias);
            self.stopMonitor(monitor.id, ()=>{
                cb();
            });
        }, ()=>{
            next();
        });
    },
    startMonitor: (id, next)=>{
        if (runningMonitors[id]) {
            clearTimeout(runningMonitors[id].timer);
        }
        let thisMonitor = {};
        if (typeof id === 'string') {
            thisMonitor= monitors.getMonitorById(id);
        } else {
            thisMonitor = id;
        }
        runningMonitors[thisMonitor._id] = {
            alias: thisMonitor.alias,
            id: thisMonitor._id,
            isRunning: false,
            isBusy: false,
            currentFile: '',
            mode: thisMonitor.config.mode,
            config: thisMonitor.config
        };
        let runningMonitor = runningMonitors[thisMonitor._id];
        runningMonitor.config.motionConfig.newCanvas = true;

        if (thisMonitor.config.mode === 'disabled') {
            log.info('Process Start Skipped, Monitor is disabled: ' + thisMonitor.alias);
            thisMonitor.isRunning = false;
            next();
        } else {
            runningMonitor.startupCommand = buildStartupCommand(thisMonitor);
            runningMonitor.process = spawnMonitorProcess(thisMonitor, runningMonitor.startupCommand); //start process and process error/close listeners
            if (runningMonitor.config.motionConfig.enableMotionDetection){
                startMotionDetection(runningMonitor);
            } else {
                log.info('Motion Detection is disabled for: ' + thisMonitor.alias);
            }
            next();
        }

    }
};


function doDetection(runningMonitor, next){
    let snapshot = runningMonitor.config.motionConfig.calculatedSnapShotLocation;
    fs.stat(snapshot, (err, stats) => {
        if (err) {
            log.info('\x1B[34mSnapshot Does Not Exist (Waiting for 3 seconds and checking again): \x1B[39m' + runningMonitor.config.motionConfig.calculatedSnapShotLocation);
            setTimeout(()=>{
                next();
            }, 3000);
        } else {
            let thisSSmTime = new Date(stats.mtime);
            //console.log('\nLast Time: ' + runningMonitor.lastSnapShotModTime + ' / ' + runningMonitor.lastSnapShotModTime.getTime());
            //console.log('This Time: ' + thisSSmTime + ' / ' + thisSSmTime.getTime());
            if (thisSSmTime.getTime() > runningMonitor.lastSnapShotModTime.getTime() && stats.size > 10) {
                //console.log('Detecting...');
                runningMonitor.lastSnapShotModTime = new Date(stats.mtime);
                let detectorPayload = {
                    id: runningMonitor.id,
                    alias: runningMonitor.alias,
                    motionConfig: runningMonitor.config.motionConfig
                };
                motionDetect.detect(detectorPayload, (confidence) => {
                    runningMonitor.isBusy = false;
                    runningMonitor.motionConfidence = confidence;
                    runningMonitor.config.motionConfig.newCanvas = false;
                    let now = new Date();
                    let diff = (now.getTime() - runningMonitor.lastEventTime.getTime()) / 1000;
                    if (confidence.normalized >= runningMonitor.config.motionConfig.eventDetectionMin && diff > runningMonitor.config.motionConfig.motionDelay && runningMonitor.config.mode === 'record') {
                        runningMonitor.lastEventTime = new Date();
                        log.info('\x1B[90mRecording Event on '+runningMonitor.alias+' due to motion detection event with confidence: ' + confidence.normalized + '\x1B[39m');
                        db.saveEvent({
                            monitorId: runningMonitor.id.toString(),
                            date: new Date(),
                            type: 'motionEvent',
                            data: confidence
                        }, () => {});
                    }
                    next();
                });
            } else {
                next();
            }
        }
    });

}

//TODO:  If motion number > 100% should it count as motion?
function startMotionDetection(runningMonitor){
    /*
    log.info('Starting Motion Detection on: ' + runningMonitor.alias);
    log.info('Detection: ' + runningMonitor.config.motionConfig.enableMotionDetection);
    log.info('Snapshots to: ' + runningMonitor.config.motionConfig.calculatedSnapShotLocation);
    log.info('Will create new canvas: ' + runningMonitor.config.motionConfig.newCanvas);
    */

    runningMonitor.lastEventTime=new Date();

    fs.exists(runningMonitor.config.motionConfig.calculatedSnapShotLocation, (exists)=>{
        if (exists) fs.unlink(runningMonitor.config.motionConfig.calculatedSnapShotLocation, ()=>{});
    });

    runningMonitor.lastSnapShotModTime = new Date();
    runningMonitor.lastSnapShotModTime.setDate(runningMonitor.lastSnapShotModTime.getDate() - 1);

    async.whilst(
        ()=>{
            let time = process.hrtime();
            process.nextTick(function() {
                let diff = process.hrtime(time);
                if (diff[0] > 2 ) {
                    log.error('Event Loop Delay is too long: ' + diff[0] + ' seconds.');
                }
                //console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);
            });
            return !!(runningMonitor.process.pid && runningMonitor.process.pid != '' && runningMonitor.config.motionConfig.enableMotionDetection);
        },
        (cb)=>{
            runningMonitor.timer = setTimeout(()=>{
                doDetection(runningMonitor, ()=>{
                    cb();
                });
            }, 200);
        },
        ()=>{
            log.info('Motion Detection has Stopped');
            //Callback
        }
    );
}

function spawnMonitorProcess(thisMonitor, startupCommand){
    //log.info('Spawning new Process: ' + startupCommand.cmd + ' ' + startupCommand.options.join(' '));
    //log.info('Spawn Detached: ' + db.dbConfig.ff.runMonitorsDetached);

    let process = spawn(startupCommand.cmd, startupCommand.options, {detached: db.dbConfig.ff.runMonitorsDetached});
    thisMonitor.pid = process.pid;
    process.on('error', (err)=>{log.error(err);}); //dump process error to log
    process.stderr.on('data', (e)=>{processAnnoyingffmpegOutput(e, thisMonitor._id, thisMonitor.alias);}); //process stderr
    process.stdout.on('data', (e)=>{processStdOut(e.toString(), thisMonitor.calculatedRecordingLocation, thisMonitor._id, thisMonitor.alias);}); //process stdout
    process.stdout.on('close', (code)=>{
        thisMonitor.pid = null;
        thisMonitor.isRunning = false;
        log.info(thisMonitor.alias + ': Process (ffmpeg) Stopped with exit code: ' + code);
    }); //log process stop
    return process;
}

function buildStartupCommand(thisMonitor){
    let options = [];
    let ff = db.dbConfig.ff;
    let startupCommand = path.resolve(ff.toolsPath, ff.ffmpegCommand);


    //build ffmpeg command [INPUT]
    options = options.concat(addOptions(getOptionsFromMonitor(ff.input, thisMonitor.config.input)));
    options.push('-i');
    options.push(thisMonitor.calculatedStreamPath);

    //build ffmpeg stream [OUTPUT]
    if (thisMonitor.config.mode === 'record') {
        //log.info('Recording video stream to: ' + thisMonitor.calculatedRecordingLocation);
        //Ensure we have a directory for record storage
        if (!fs.existsSync(path.resolve(thisMonitor.calculatedRecordingLocation,thisMonitor.alias))){
            fs.mkdirSync(path.resolve(thisMonitor.calculatedRecordingLocation,thisMonitor.alias));
        }
        options = options.concat(addOptions(getOptionsFromMonitor(ff.output, thisMonitor.config.recordOutput)));
        options.push(path.resolve(thisMonitor.calculatedRecordingLocation, thisMonitor.alias, thisMonitor.alias + '_%Y-%m-%dT%H-%M-%S.mp4'));
    }

    //build ffmpeg command [ScreenShot]
    if (thisMonitor.config.motionConfig.enableMotionDetection) {
        //log.info('Enabling Still Image Creation');
        options = options.concat(addOptions(getOptionsFromMonitor(ff.stillImage, {})));
        options.push('-s');
        options.push(thisMonitor.config.motionConfig.s);
        options.push(thisMonitor.config.motionConfig.calculatedSnapShotLocation);
        options.push('-y');
    }

    //build live feed command
    options = options.concat(addOptions(getOptionsFromMonitor(ff.liveOutputStream, thisMonitor.config.liveOutputStream)));
    options.push('http://localhost:'+ global.port + '/streamIn/' + thisMonitor._id);

    return {cmd: startupCommand, options: options};
}

function getOptionsFromMonitor(defaults, monitor){
    for (let i in monitor){
        defaults[i] = monitor[i];
    }
    return defaults;
}

function processStdOut(stdout, location, id, alias){
    let vids = {date: new Date()};
    vids.monitorId = id.toString();
    vids.alias = alias;
    vids.filename = path.resolve(location, alias, stdout.replace('\n', ''));
    runningMonitors[id].currentFile = vids.filename;
    log.info('\x1B[90mSegment Complete, Recording Video in DB: ' + vids.filename +'\x1B[39m');
    getVideoMetaData(vids.filename, (meta)=>{
        vids.meta = meta;
        vids.startDate = new Date(vids.date - (vids.meta.duration * 1000));
        db.saveVideoMeta(vids, ()=>{});
    });
}

function getVideoMetaData(vid, next){
    let probeCommand = path.resolve(db.dbConfig.ff.toolsPath, db.dbConfig.ff.probeCommand);
    probeCommand += ' ' + db.dbConfig.ff.probeMin + ' "' + vid + '"';
    let vProbe = JSON.parse(execSync(probeCommand).toString());
    let meta = {size: getReadableFileSizeString(vProbe.format.size), length:getReadableLength(vProbe.format.duration), bytesize: vProbe.format.size, duration:vProbe.format.duration};
    next(meta);
}

function getReadableLength(l) {
    var sec_num = parseInt(l, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = '0'+hours;}
    if (minutes < 10) {minutes = '0'+minutes;}
    if (seconds < 10) {seconds = '0'+seconds;}
    return hours+':'+minutes+':'+seconds;
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

function processAnnoyingffmpegOutput(err, id, alias){
    runningMonitors[id].isRunning = true;
    err = err.toString();
    if (err.indexOf(' Opening ') > -1) {
    //log.debug('Writing new File to Database from info output');
        let file = err.split(/'/)[1];
        let vids = {date: new Date(), fullPath: file };
        vids.monitorId = id;
        vids.alias = alias;
        vids.filename = file.split('\\').pop();
        runningMonitors[id].currentFile = file;
        db.saveVideoMeta(vids, ()=>{});
    } else if (err.indexOf(alias) > -1 && err.indexOf('.mp4')>-1) {
    //log.debug('Writing new File to Database from info output');
        let vids = {date: new Date()};
        vids.monitorId = id;
        vids.alias = alias;
        vids.filename = err;
        runningMonitors[id].currentFile = err;
        db.saveVideoMeta(vids, ()=>{});
    } else if (err.indexOf('Error') > -1) {
        log.error('FFMpeg Error: ' + err);
    } else if (err.indexOf('Failed') > -1) {
        log.error('FFMpeg Fail: ' +err);
    } else {
        //log.error(err);
    }

}

function addOptions(options){
    let newOptions = [];
    for (let option in options){
        if (option !== '') newOptions.push('-' + option);
        if (options[option] !== '') newOptions.push(options[option]);
    }
    return newOptions;
}


function fixIDs(){
    let ObjectID = require('mongodb').ObjectID;
    let dbc = db.get().collection('vids');
    db.query('vids', {}, (err, doc)=>{
        async.eachSeries(doc, (d, cb)=>{
            let mid = d.monitorId.str;
            console.log(mid);
            dbc.update({_id: ObjectID(d._id)}, {$set: {monitorId: mid}}, ()=>{
                cb();
            });
        },
        ()=>{
            console.log('Done');
        });
    });
}
