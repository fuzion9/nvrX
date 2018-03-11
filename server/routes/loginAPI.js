let express = require('express');
let router = express.Router();
let jwt = require('jsonwebtoken');
let config = require('../lib/db').dbConfig;
let moment = require('moment');
let db = require('../lib/db');
let log = require('../lib/logger');
let bcrypt = require('bcrypt');


router.post('/', function(req, res) {
    /*
     * Check if the username and password is correct (only admin/admin will work as this stands, must read real un/pw from database, pw is bcrypted
     */
    tryLogin(req.body.username, req.body.password, (err, result)=>{
        if(!err) {
            log.info(result);
            let tokenExpires = moment();

            tokenExpires.add(config.jwtConfig.expiryTime, 'seconds');
            let token = {
                id: 1,
                username: 'admin',
                expires: tokenExpires.toString(),
                jwt: jwt.sign({
                    id: 1,
                }, config.jwtConfig.JWT_SECRET, {expiresIn: config.jwtConfig.expiryTime})
            };
            req.session.jwtToken = token;
            res.json(token);
        } else {
            log.info(err);
            /*
             * If the username or password was wrong, return 401 ( Unauthorized )
             * status code and JSON error message
             */
            res.status(401).json({
                error: {
                    message: 'Wrong username or password!'
                }
            });
        }
    });
});

function tryLogin(login, password, next){
    db.query('users', {login:login}, (err, result)=>{
        if (err || !result || result.length < 1){
            next('Bad username', null);
        } else {
            checkPassword(password, result[0].password, (valid)=>{
                if (valid) {
                    next(null, result[0]);
                } else {
                    next('Bad password', null);
                }
            });

        }
    });
}

function checkPassword(pInput, pStored, next){
    console.log(pInput + ' / ' + pStored);
    bcrypt.compare(pInput, pStored, (err, result)=>{
        if (err){
            console.log(err);
            next(false);
        } else {
            next(result);
        }
    });

}



module.exports = router;


