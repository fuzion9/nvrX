let mongoClient = require('mongodb').MongoClient;
let ObjectID = require('mongodb').ObjectID;
let state = {db: null, status: 'Disconnected'};
let log = require('../lib/logger');

let self = module.exports = {
    dbConfig: {},
    saveEvent: (event, next)=>{
        let col = state.db.collection('events');
        col.insert(event, (err, response)=>{
            if (err){
                log.error(err);
                next('Error saving video data');
            } else {
                next('Video Event recorded successfully');
            }
        });
    },
    saveVideoMeta: (vidData, next)=>{
        let col = state.db.collection('vids');
        col.insert(vidData, (err, response)=>{
            if (err){
                log.error(err);
                next('Error saving video data');
            } else {
                next('Video Segment recorded successfully');
            }
        });
    },
    delete: (collection, query, next)=>{
        let col = state.db.collection(collection);
        col.deleteMany(query, (err, result)=>{
            if (err) log.error(err);
            next(result);
        });
    },
    query: (collection, query, next) => {
        let col = state.db.collection(collection);
        col.find(query).toArray((err, result) => {
            if (err) {
                log.error(err);
                next(err, null);
            } else {
                next(null, result);
            }
        });
    },
    querySort: (collection, query, sort, next) => {
        let col = state.db.collection(collection);
        col.find(query).sort(sort).toArray((err, result) => {
            if (err) {
                log.error(err);
                next(err, null);
            } else {
                next(null, result);
            }
        });
    },
    updateMonitorActiveStatus(m){
        let col = state.db.collection('monitors');
        col.findOneAndUpdate({_id:ObjectID(m.id)}, {$set: {active: m.active}}, ()=>{
            log.info('Set ' + m.alias + ': ' + m.active);
        });
    },
    dbConfigSave: (config)=>{
        if (config) self.dbConfig = config;
        let id = ObjectID(self.dbConfig._id);
        let newConfig = JSON.parse(JSON.stringify(self.dbConfig));
        delete newConfig._id;
        let col = state.db.collection('config');
        col.findOneAndUpdate({_id: id}, newConfig, (err, result)=>{
            if (err) log.error(err);
        });
    },
    updateUserSortOrder:(id, newOrder, next)=>{
        let col = state.db.collection('users');
        col.findOneAndUpdate({_id:ObjectID(id)}, {$set:{sortOrder:newOrder}}, (err, result)=>{
            if (err){
                console.log(err);
                next('Update User Sort Order Failed');
            } else {
                next('Update User Sort Order Complete');
            }
        });
    },
    updateMonitor: (monitor, next)=>{
        if (!monitor.config.motionConfig.enableMotionDetection){
            monitor.config.motionConfig.drawDiffBox = false;
            monitor.config.motionConfig.showMotionLevel = false;
        }
        let col = state.db.collection('monitors');
        if (!monitor._id){
            col.insertOne(monitor, (err, response)=>{
                if (err){
                    log.error('Error inserting monitor: ' + monitor.alias);
                    log.error(err);
                    next(err, null);
                } else {
                    monitor._id = response.insertedId.toString();
                    next(null, monitor);
                }
            });
        } else {
            let id = ObjectID(monitor._id);
            let data = JSON.parse(JSON.stringify(monitor));
            delete data._id;
            col.findOneAndUpdate({_id: id}, data, (err, response) => {
                if (err) {
                    log.error('Error updating monitor: ' + monitor.alias);
                    log.error(err);
                    next(err, null);
                } else {
                    next(null, monitor);
                }
            });
        }
    },
    readConfig: (next)=>{
        self.query('config', {}, (err, result)=>{
            if (result.length < 1){
                console.log('Config Not Found, Creating new config collection with default data');
                state.db.collection('config').insertOne(require('../conf/dbSchema/config'), (err, result)=>{
                    state.db.collection('users').insertOne(require('../conf/dbSchema/users'), (err, result)=>{
                        setTimeout(()=>{
                            self.readConfig(next);
                        }, 2000);
                    });
                });
            } else {
                self.dbConfig = result[0];
                next();
            }
        });
    },
    connect: (url, next) => {
        if (state.db) return next();
        mongoClient.connect(url, function (err, db) {
            if (err) {
                state.status = 'Error';
                state.error = err;
                log.error(err);
                next(err);
            } else {
                let dbc = url.split('/');
                log.info('Connected to MongoDB @ ' + dbc[2] + ' using Database ' + dbc[dbc.length - 1]);
                state.db = db.db(dbc[dbc.length - 1]);
                self.readConfig(()=>{
                    next();
                });
            }
        });
    },
    get: () => {
        return state.db;
    },

    close: (next) => {
        if (state.db) {
            mongoClient.close(function (err, result) {
                state.db = null;
                next(err);
            });
        }
    }
};
