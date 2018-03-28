let express = require('express');
let os = require('os');
let path = require('path');
let execSync = require('child_process').execSync;
let log = require('../lib/logger');
let router = express.Router();
let monitors = require('../lib/monitor');
let db = require('../lib/db');
let util = require('util');
let fs = require('fs');
let runner = require('../lib/monitorRunner');
let async = require('async');
let moment = require('moment');
let request = require('request');
let ObjectID = require('mongodb').ObjectID;

router.get('/doHouseKeeping', function (req, res) {
    console.log('Start House Keeping');
    monitors.housekeeping();
    res.json({job: 'Started'});
});

router.get('/getLatestUserData', function (req, res) {
    console.log('Get Latest User Data');
    db.query('users', {_id:ObjectID(req.session.jwtToken.id)}, (err, result)=>{
        res.json(result[0]);
    });
});

router.post('/updateUserSortOrder', function (req, res) {
    let newOrder = req.body;
    log.info('\x1B[35m[Update user Sort Order]' + '\x1B[39m');
    db.updateUserSortOrder(req.session.jwtToken.id, newOrder.newOrder, (result)=>{
        console.log(result);
        res.json(newOrder);
    });
});

router.post('/updateActivationStatus', function (req, res) {
    let m = req.body;
    for (let i = 0; i < m.length; i++) {
        db.updateMonitorActiveStatus(m[i], () => {});
    }
    res.json(m);
});

router.post('/updateMonitorAndRestart/:id', function (req, res) {
    log.info('\x1B[35m[Hard Update Monitor from GUI - Restarting Monitor]\x1B[39m');
    monitors.updateMonitor(req.body, (err, m) => {
        if (err) {
            res.json({result: false, monitorDetails: req.body});
        } else {
            runner.restartMonitor(m._id, () => {
                res.json({result: true, monitorDetails: m});
            });
        }
    });
});

router.post('/updateSystemConfig', function (req, res) {
    log.info('\x1B[35m[System Config Update from GUI]\x1B[39m');
    db.dbConfigSave(req.body);
    res.json({result: true});
});

router.post('/updateMonitor/:type/:id', function (req, res) {
    log.info('\x1B[35m[Soft Update Monitor: ' + req.params.type + ']\x1B[39m');
    monitors.updateMonitor(req.body, (err, m) => {
        if (err) {
            res.json({result: false, monitorDetails: req.body});
        } else {
            if (req.params.type === 'MotionOnlyChange') {
                //console.log(m.config.motionConfig);
                runner.updateMotionValues(m._id, m.config.motionConfig);
            }
            res.json({result: true, monitorDetails: m});
        }
    });
});

router.post('/probeMonitor', function (req, res) {
    monitors.doProbe(req.body, (result) => {
        res.json(result);
    });
});

router.get('/monitorList', function (req, res) {
    res.json(monitors.getCurrentMonitors());
});

router.get('/getEveryKnownMonitor', function (req, res) {
    db.query('monitors', {}, (err, result) => {
        res.json(result);
    });

});

router.get('/monitorDetails/:id', function (req, res) {
    log.debug('Monitor Details Request: ' + req.params.id);
    let monitor = monitors.getMonitorById(req.params.id);
    let monitorLive = runner.getMonitor(req.params.id);
    if (monitorLive && monitorLive.pid) {
        monitor.pid = monitorLive.pid;
    }
    res.json(monitor);
});

router.get('/monitorConfig/:id', function (req, res) {
    let monitor = monitors.getMonitorById(req.params.id);
    res.json(monitor.config);
});

router.get('/dbConfig', function (req, res) {
    res.json(db.dbConfig);
});

router.get('/', function (req, res) {
    res.send('index', {error: '404'});
});

router.post('/v1/fbrowse', function (req, res) {
    let d = req.body.folder; //.replace('\\', '');
    let drives = [];
    if (d.length <= 1) {
        if (os.platform() == 'win32') {
            if (!d || d[0] == '') d[0] = 'C:';
            d[0] = d[0].replace(/\\/g, '');
            d = [d[0] + '\\'];
        } else {
            d = ['/'];
        }
    }
    if (os.platform() =='win32') {
        let d = execSync('wmic logicaldisk get name').toString().split('\r\r\n');
        for (let i = 0; i < d.length; i++){
            let thisDrive = d[i].trim();
            if (thisDrive.indexOf('Name') === -1 && thisDrive!==''){
                drives.push(thisDrive);
            }
        }
    }
    //console.log(drives);
    let dir = path.normalize(d.join('\\'));

    //console.log(dir);
    fs.readdir(dir, (err, result)=>{
        if (result) {
            result = result.filter(file => {
                try {
                    return fs.statSync(path.join(dir, file)).isDirectory();
                } catch (e) {
                    return false;
                }
            });
        } else {
            result = [];
        }
        res.json({dir: d, contents: result, drives: drives, os: os.platform()});
    });

});

router.post('/v1/vids', function (req, res) {
    console.log(req.body);
    let dt = moment(req.body.date);
    let start = moment(dt).startOf('day');
    let end = moment(dt).endOf('day');
    //console.log('Date:' + start.toDate() + ' - ' + end.toDate());
    let query = {
        monitorId: req.body.monitorId,
        $and: [
            {date: {$gte: start.toDate()}},
            {date: {$lte: end.toDate()}}
        ]
    };
    console.log(util.inspect(query, 0, 20, true));
    let matchingVids = [];
    db.querySort('vids', query, {date: -1}, (err, vids) => {
        if (err) log.debug(err);
        matchingVids = vids;
        //console.log('Found ' + matchingVids.length + ' videos');
        async.eachSeries(matchingVids, (v, cb) => {
            let duration = Math.round(v.meta.duration);
            let endClipTime = new Date(v.startDate);
            endClipTime.setSeconds(endClipTime.getSeconds() + duration);
            //console.log(new Date(v.startDate) + '/ ' + endClipTime + '(' + duration + ')');
            let eQuery = {
                monitorId: req.body.monitorId,
                $and: [
                    {date: {$gte: v.startDate}},
                    {date: {$lte: endClipTime}}
                ]
            };
            //console.log(util.inspect(eQuery, 0, 20, true));
            db.querySort('events', eQuery, {date: 1}, (err, e) => {
                v.eventCount = e.length;
                v.events = e;
                cb();
            });
        },
        () => {
            res.json(matchingVids);
        });
    });
});

router.get('/ptzAction/:id/:action', function (req, res) {
    let monitor = monitors.getMonitorById(req.params.id);
    let action = req.params.action;
    //console.log(monitor.alias + ': ' + action);

    let actionURL = 'http://' +monitor.username + ':' + monitor.password + '@' + monitor.host + monitor.config.ptz[action];

    request(actionURL,(err, result, body)=>{
        console.log(actionURL);
        console.log(body);
        res.send({result: true});
    });
});

module.exports = router;

