let express = require('express');
let events = require('events');
let log = require('../lib/logger');
let router = express.Router();
let Emitters = {};
let runner = require('../lib/monitorRunner');
let fs = require('fs');
let ObjectID = require('mongodb').ObjectID;
let allowNonPartialStreaming = false;
let db = require('../lib/db');
let jwt = require('jsonwebtoken');

let initEmitter = (feed) => {
    if (!Emitters[feed]) {
        Emitters[feed] = new events.EventEmitter().setMaxListeners(0);
    }
    return Emitters[feed];
};

router.all('/:feed', function (req, res) {
    let monitor = runner.getMonitor(req.params.feed);
    let io = req.app.get('io');
    req.Emitter = initEmitter(req.params.feed);
    res.connection.setTimeout(0);
    req.on('data', (buffer) => {
        req.Emitter.emit('data', buffer);
        io.to('STREAM_' + req.params.feed).emit('h264', {
            feed: req.params.feed,
            mode: monitor.mode,
            isRunning: monitor.isRunning,
            confidence: monitor.motionConfidence,
            detectionDelay: monitor.lastDetectionTime,
            buffer: buffer
        });
    });
    req.on('end', function () {
        io.to('STREAM_' + req.params.feed).emit('h264', {
            feed: req.params.feed,
            mode: monitor.mode,
            isRunning: false,
            confidence: {},
            //detectionDelay: 0,
            buffer: null
        });
        log.debug('Incoming Camera Stream Closed');
    });
});

router.get('/diffImage/:id', function (req, res) {
    if (!req.session.jwtToken){
        return res.status(401).json({
            error: {
                msg: 'Failed to authenticate token!',
                e: 'No session token found.'
            }
        });
    } else {
        try {
            let verify = jwt.verify(req.session.jwtToken.jwt, db.dbConfig.jwtConfig.JWT_SECRET);
            let monitor = runner.getMonitor(req.params.id);
            let file = monitor.config.motionConfig.calculatedSnapShotLocation + '.diff.jpg';
            fs.readFile(file, (err, data) => {
                if (err) log.error(err);
                res.writeHead(200, {'Content-Type': 'image/jpg'});
                res.end(data, 'binary');
            });
        } catch (e) {
            console.log(e);
            return res.status(401).json({
                error: {
                    msg: 'Failed to authenticate token!',
                    e: e
                }
            });
        }
    }
});

router.get('/snapshot/:id', function (req, res) {
    try {
        let verify = jwt.verify(req.session.jwtToken.jwt, db.dbConfig.jwtConfig.JWT_SECRET);
        let monitor = runner.getMonitor(req.params.id);
        let file = monitor.config.motionConfig.calculatedSnapShotLocation;
        fs.readFile(file, (err, data) => {
            if (err) log.error('streamIn.js || get snapshot error:' + err);
            res.writeHead(200, {'Content-Type': 'image/jpg'});
            res.end(data, 'binary');
        });
    } catch (e) {
        console.log(e);
        return res.status(401).json({
            error: {
                msg: 'Failed to authenticate token!',
                e: e
            }
        });
    }
});

router.get('/vidFile/:vId', function (req, res) {
    //TODO: How to ensure we have a valid token here.
    //console.log(req.session);
    try {
        let verify = jwt.verify(req.session.jwtToken.jwt, db.dbConfig.jwtConfig.JWT_SECRET);
        db.query('vids', {_id: ObjectID(req.params.vId)}, (err, vid) => {
            if (vid.length > 0) {
                const path = vid[0].filename;
                fs.stat(path, (err, stat)=>{
                    if(err){
                        log.debug('Could not find [' + vid[0].filename + ']');
                        res.end('File Not Found');
                    } else {
                        const fileSize = stat.size;
                        const range = req.headers.range;
                        if (range) {
                        //log.info('Streaming Partial Content File: ' + path + ' (' + stat.size + ' bytes)');
                            const parts = range.replace(/bytes=/, '').split('-');
                            const start = parseInt(parts[0], 10);
                            const end = parts[1]
                                ? parseInt(parts[1], 10)
                                : fileSize - 1;
                            const chunksize = (end - start) + 1;
                            const file = fs.createReadStream(path, {start, end});
                            const head = {
                                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                                'Accept-Ranges': 'bytes',
                                'Content-Length': chunksize,
                                'Content-Type': 'video/mp4',
                            };
                            res.writeHead(206, head);
                            file.pipe(res);
                        } else {
                            if (!allowNonPartialStreaming) {
                                log.error('Not Allowed to send Full File: ' + path + ' (' + stat.size + ' bytes)');
                                return res.sendStatus(416);
                            } else {
                                log.info('Streaming FULL non chunked  File: ' + path + ' (' + stat.size + ' bytes)');
                                const head = {
                                    'Content-Length': fileSize,
                                    'Content-Type': 'video/mp4',
                                };
                                res.writeHead(200, head);
                                fs.createReadStream(path).pipe(res);
                            }
                        }
                    }

                });

            }

        });
    } catch (e) {
        console.log(e);
        return res.status(401).json({
            error: {
                msg: 'Failed to authenticate token!',
                e: e
            }
        });
    }

});

router.get('/v1/vtt', function (req, res) {
    let vtt = `WEBVTT FILE

1
00:00:00.001 --> 00:00:00.100
Playing....
`;
    res.send(vtt);
});

module.exports = router;
