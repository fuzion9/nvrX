let async = require('async');
let path = require('path');
let db = require('../lib/db');
let log = require('../lib/logger');
let execSync = require('child_process').execSync;
let monitors = [];

let self = module.exports = {

    updateMonitor: (monitor, next) => {
        buildStreamPaths(monitor, (m) => {
            db.updateMonitor(m, (err, result) => {
                if (err) {
                    log.error('Error Updating Monitor');
                    next(err, null);
                } else {
                    self.updateInMemoryMonitor(result);
                    next(null, result);
                }
            });
        });
    },

    updateInMemoryMonitor(m){
        let found = false;
        for (let i = 0; i < monitors.length; i++){
            if (monitors[i]._id.toString() === m._id){
                log.info('Update In Memory Monitor: ' + m.alias);
                monitors[i] = m;
                found = true;
            }
        }
        if (!found){
            monitors[m._id] = m;
        }

    },

    getMonitorById: (id) => {
        let monitor = monitors.filter((m) => {
            return m._id.toString() === id;
        });
        return monitor[0];
    },

    getCurrentMonitors: () => {
        return monitors;
    },

    doProbe: (newMonitor, next) => {
        let monitor = monitors.filter((m) => {
            return m._id.toString() === newMonitor._id;
        });
        if (monitor.length > 0) {
            monitor[0] = newMonitor;
        } else {
            monitor.push(newMonitor);
        }
        buildStreamPaths(monitor[0], (m) => {
            doprobe(m, () => {
                next(m);
            });
        });
    },

    getAllMonitors: (next) => {
        readMonitors((m) => {
            monitors = m;
            for (let i = 0; i < monitors.length; i++){
                buildFileLocations(monitors[i]);
                if (!monitors[i].config.ptz){
                    monitors[i].config.ptz = {enabled:false};
                }
            }
            next(monitors);
        });

    }
};



function buildFileLocations(thisMonitor){
    let storageLocation = db.dbConfig.storageLocations.filter((sl)=>{
        return sl.name === thisMonitor.recordLocation;
    });
    thisMonitor.calculatedRecordingLocation = storageLocation[0].path;
    thisMonitor.config.motionConfig.calculatedSnapShotLocation = path.resolve(storageLocation[0].path, thisMonitor.alias + '.jpg');
    if (thisMonitor.snapShotLocation) {
        let snapShotLocation = db.dbConfig.storageLocations.filter((sl) => {
            return sl.name === thisMonitor.snapShotLocation;
        });
        thisMonitor.config.motionConfig.calculatedSnapShotLocation = path.resolve(snapShotLocation[0].path, thisMonitor.alias + '.jpg');
    }
}




function readMonitors(next){
    db.query('monitors', {active: true}, (err, result)=>{
        async.eachSeries(result, (monitor, cb)=>{
            buildStreamPaths(monitor, (m) => {
                monitor.calculatedStreamPath = m.calculatedStreamPath;
                cb();
            });
        },()=>{
            next(result);
        });
    });
}

function buildStreamPaths(m, next){
    let newPath = m.type + '://' + m.username + ':' + m.password + '@' + m.host + m.path;
    if (newPath !== m.calculatedSnapShotLocation){
        m.calculatedStreamPath = newPath;
    }
    next(m);
}

function doprobe(monitor, next){
    let fullProbeCommand = path.resolve(db.dbConfig.ff.toolsPath, db.dbConfig.ff.probeCommand) + ' ' + db.dbConfig.ff.probeFull + ' ' + monitor.calculatedStreamPath;
    log.info('['+monitor._id+'] Probing with : ' + fullProbeCommand);
    try {
        monitor.ffProbe = JSON.parse(execSync(fullProbeCommand).toString());
        monitor.ffProbe.lastProbe = new Date();
        db.updateMonitor(monitor, ()=>{
            next();
        });
    } catch (e){
        fullProbeCommand = db.dbConfig.ff.toolsPath + '\\ffprobe -v error ' + monitor.calculatedStreamPath;
        try {
            monitor.ffProbe = execSync(fullProbeCommand).toString();
        }catch(e){
            log.error(e.message);
            e.message = e.message.split('\n');
            monitor.ffProbe = e.message[e.message.length-2].replace('\r', '');
        }
        monitor.ffProbe.lastProbe = new Date();
        db.updateMonitor(monitor, ()=>{
            next();
        });
    }


}
