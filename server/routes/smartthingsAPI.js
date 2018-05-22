let express = require('express');
let router = express.Router();
let monitors = require('../lib/monitor');

router.get('/availableCams', function(req, res) {
    console.log('SmartThings Requested Available Cameras');
    let availCams = monitors.getCurrentMonitors();
    let result = [];
    for (let i = 0; i<availCams.length; i++){
        result.push({id: availCams[i]._id, name: availCams[i].alias});
    }
    res.json(result);
});

module.exports = router;
