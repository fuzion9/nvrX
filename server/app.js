let express = require('express');
let db = require('./lib/db');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let log = require('./lib/logger');
let app = express();


app.use(session({
    secret: 'foo',
    store: new MongoStore({
        db: db.get(),
        autoRemove: 'native', // Default
    }),
    resave: true,
    saveUninitialized: true
}));

// view engine setup for any routes where we won't use angular but want to provide an express view
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(logger('combined', {
    skip: function (req, res) {
        return res.statusCode < 400;
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//non-angular routes
app.use('/api', require('./lib/middlewares/auth'));
app.use('/api', require('./routes/api'));
app.use('/streamIn', require('./routes/streamIn'));
app.use('/loginAPI', require('./routes/loginAPI'));
app.use('/st', require('./routes/smartthingsAPI'));
//handoff any static files to angular build directory
app.use(express.static(path.join(__dirname, '../dist')));
//handoff any requests without a file to angulars index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
module.exports = app;
