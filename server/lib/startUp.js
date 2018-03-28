let path = require('path');
let db = require('../lib/db');
let log = require('../lib/logger');
let execSync = require('child_process').execSync;
let monitors = require('../lib/monitor');
let runner = require('../lib/monitorRunner');
let fs = require('fs');

let self = module.exports = {
    startup: () => {
        //log.info('\x1B[35m[System Startup]\x1B[39m');
        self.getAvailableHardwareAccellerators();
        monitors.getAllMonitors((m) => {
            runner.startAllMonitors(m, ()=>{
                monitors.housekeeping();
            });
        });
    },
    getAvailableHardwareAccellerators: () => {
        let toolsPath = path.resolve(db.dbConfig.ff.toolsPath, 'ffmpeg');
        if (fs.existsSync(toolsPath) || fs.existsSync(toolsPath + '.exe')){
            let command = path.resolve(db.dbConfig.ff.toolsPath, 'ffmpeg -v quiet -hwaccels');
            db.dbConfig.ff.availableHWAccels = execSync(command).toString().trim().replace(/\r/g, '').split('\n').splice(1);
            db.dbConfigSave();
        } else {
            log.debug('ffmpeg Tools not found at: ' + toolsPath);
        }
    }
};
