let log = require('../lib/logger');
let fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
let monitor = {
    alias: null,
    motionConfig:null
};
let drawNewCanvas = true;

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on('message', (config)=>{
    if (typeof config === 'object') {
        for (let key in config) {
            if (config.hasOwnProperty(key)) {
                monitor[key] = config[key];
            }
        }
        drawNewCanvas = true;
    } else {
        if (config==='detect') {
            performDetection();
        }
    }
});


function newCanvas(img){
    if (monitor.motionAreaPixelCount === 0){
        monitor.motionAreaPixelCount = img.height * img.width;
        log.debug('*** WARNING *** Motion Detection Area is not configured for: ' + monitor.alias);
        log.debug('   Using Full Frame as area: ' );
    }
    log.info('\x1B[36m[Creating New Canvas]\x1B[39m (' + img.width + 'x' + img.height + ') for: ' + monitor.alias);
    monitor.canvas = new createCanvas(img.width, img.height);
    monitor.ctx = monitor.canvas.getContext('2d');
    filterRegion(monitor.motionConfig.motionArea, monitor.ctx);
    monitor.ctx.drawImage(img, 0, 0, img.width, img.height);
    drawNewCanvas = false;
}


function performDetection(){
    loadImage(monitor.motionConfig.calculatedSnapShotLocation).then((img) => {
        if (drawNewCanvas) {
            newCanvas(img);
        }
        let imageScore = 0;
        //setup for diff
        monitor.ctx.globalCompositeOperation = 'difference';
        //draw diff
        monitor.ctx.drawImage(img, 0, 0, img.width, img.height);
        //capture diff
        let diffData = monitor.ctx.getImageData(0, 0, img.width, img.height);
        //reset to original for next iteration
        monitor.ctx.globalCompositeOperation = 'source-over';
        monitor.ctx.drawImage(img, 0, 0, img.width, img.height);


        let tempcanvas = new createCanvas(img.width, img.height);
        let tempctx = tempcanvas.getContext('2d');
        let tempData = tempctx.getImageData(0, 0, img.width, img.height);
        for (let i = 0; i < diffData.data.length; i += 4) {
            let lum = diffData.data[i] * 0.3 + diffData.data[i + 1] * 0.59 + diffData.data[i + 2] * 0.11;
            lum = lum < monitor.motionConfig.threshold ? 0 : 255;
            tempData.data[i] = lum;
            tempData.data[i + 1] = lum;
            tempData.data[i + 2] = lum;
            tempData.data[i + 3] = 255;

            if (lum > 0) {
                imageScore++;
            }
        }
        tempctx.putImageData(tempData, 0, 0);

        try {
            tempcanvas.toDataURL('image/jpeg', (err, jpeg) => {
                //console.log('Temp Canvas exported to jpeg');
                if (err) log.debug(err);
                jpeg = jpeg.replace(/^data:image\/\w+;base64,/, '');
                //console.log('Writing Image to disk');
                fs.writeFile(monitor.motionConfig.calculatedSnapShotLocation + '.diff.jpg', new Buffer(jpeg, 'base64'), (err) => {
                    //console.log('Done Image to disk');
                    if (err) log.error('Error writing JPEG file' + err);
                    process.send({
                        threshold: monitor.motionConfig.threshold,
                        normalizer: monitor.motionConfig.motionNormalizer,
                        raw: imageScore,
                        motionAreaSize: monitor.motionConfig.motionAreaPixelCount,
                        normalized: motionNormalizer(monitor.motionConfig.motionAreaPixelCount,monitor.motionConfig.motionNormalizer, imageScore)
                    });
                });
            });
        } catch (e) {
            log.error('An unknown error has occurred getting image data to URL from canvas');
            log.debug(e);
        }
    },
    (err)=>{
        //console.log('error: ' + err);
    });

}

function filterRegion(area, ctx){
    if (area && area!==''){
        ctx.beginPath();
        let coords = area.split(',');
        ctx.moveTo(parseInt(coords[0]),parseInt(coords[1]));
        for (let i = 2; i < coords.length; i+=2) {
            ctx.lineTo(parseInt(coords[i]),parseInt(coords[i+1]));
        }
        ctx.closePath();
        ctx.strokeStyle='red';
        ctx.stroke();
        ctx.clip();
    }
}

function motionNormalizer(regionCount, normalizer, c){
    if (normalizer == null || normalizer<1) normalizer = 1;
    regionCount = regionCount / normalizer;
    //console.log('normalizer: ' + normalizer + ' || ' + c + '/' + regionCount);
    if (c) {
        let confidenceP = c / regionCount;
        //console.log(confidenceP);
        return Math.round(confidenceP * 100);
    } else {
        return 0;
    }
}
