let log = require('../lib/logger');
let fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
let monitors = {};
let scaleFactor = 3;

let self = module.exports = {
    detect: (m, next) => {
        fs.exists(m.motionConfig.calculatedSnapShotLocation, (fileExists)=>{
            if (fileExists) {
                fs.stat(m.motionConfig.calculatedSnapShotLocation, (err, stat)=> {
                    loadImage(m.motionConfig.calculatedSnapShotLocation).then((img) => {
                        if (m.motionConfig.newCanvas || m.motionConfig.motionAreaPixelCount !== monitors[m.id].existingMotionAreaPixelCount) {
                            monitors[m.id] = null;
                        }
                        if (!monitors[m.id]) {
                            if (m.motionConfig.motionAreaPixelCount == 0){
                                m.motionConfig.motionAreaPixelCount = img.height * img.width;
                                log.debug('*** WARNING *** Motion Detection Area is not configured for: ' + m.alias);
                                log.debug('   Using Full Frame as area: ' );
                            }
                            log.info('\x1B[36m[Creating New Canvas]\x1B[39m (' + img.width + 'x' + img.height + ') for: ' + m.alias);
                            //log.debug('Motion Region Filter: ' + m.motionArea);
                            monitors[m.id] = {};
                            monitors[m.id].existingMotionAreaPixelCount = m.motionConfig.motionAreaPixelCount;
                            monitors[m.id].detections = 0;
                            monitors[m.id].alias = m.alias;
                            monitors[m.id].canvas = new createCanvas(img.width, img.height);
                            monitors[m.id].ctx = monitors[m.id].canvas.getContext('2d');
                            filterRegion(m.motionConfig.motionArea, monitors[m.id].ctx);
                            monitors[m.id].ctx.drawImage(img, 0, 0, img.width, img.height);
                        }

                        monitors[m.id].ctx.globalCompositeOperation = 'difference';
                        filterRegion(m.motionConfig.motionArea, monitors[m.id].ctx);
                        monitors[m.id].ctx.drawImage(img, 0, 0, img.width, img.height);
                        filterRegion(m.motionConfig.motionArea, monitors[m.id].ctx);

                        let imageData = monitors[m.id].ctx.getImageData(0, 0, img.width, img.height);
                        let imageScore = 0;
                        let threshold = m.motionConfig.threshold ? m.motionConfig.threshold : 10;
                        let tempcanvas = new createCanvas(img.width, img.height);
                        let tempctx = tempcanvas.getContext('2d');
                        let tempData = tempctx.getImageData(0, 0, img.width, img.height);
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            let lum = imageData.data[i] * 0.3 + imageData.data[i + 1] * 0.59 + imageData.data[i + 2] * 0.11;
                            lum = lum < threshold ? 0 : 255;
                            tempData.data[i] = lum;
                            tempData.data[i + 1] = lum;
                            tempData.data[i + 2] = lum;
                            tempData.data[i + 3] = 255;

                            if (lum > 0) {
                                imageScore++;
                            }
                        }

                        monitors[m.id].detections++;
                        tempctx.putImageData(tempData, 0, 0);
                        //log.debug('Temp Canvas Created: ' + tempData.data.length);
                        //log.debug('I fail frequently getting the temp canvas toDataUrl');
                        //tempctx.scale((1/scaleFactor), (1/scaleFactor));
                        try {
                            tempcanvas.toDataURL('image/jpeg', (err, jpeg) => {
                                //console.log('Temp Canvas exported to jpeg');
                                if (err) log.debug(err);
                                jpeg = jpeg.replace(/^data:image\/\w+;base64,/, '');
                                //console.log('Writing Image to disk');
                                fs.writeFile(m.motionConfig.calculatedSnapShotLocation + '.diff.jpg', new Buffer(jpeg, 'base64'), (err) => {
                                    //console.log('Done Image to disk');
                                    if (err) log.error('Error writing JPEG file' + err);
                                    monitors[m.id].ctx.globalCompositeOperation = 'source-over';
                                    filterRegion(m.motionConfig.motionArea, monitors[m.id].ctx);
                                    monitors[m.id].ctx.drawImage(img, 0, 0, img.width, img.height);
                                    next({
                                        threshold: m.motionConfig.threshold,
                                        normalizer: m.motionConfig.motionNormalizer,
                                        raw: imageScore,
                                        motionAreaSize: m.motionConfig.motionAreaPixelCount,
                                        normalized: motionNormalizer(m.motionConfig.motionAreaPixelCount, m.motionConfig.motionNormalizer, imageScore)
                                    });
                                });
                            });
                        } catch (e) {
                            log.error('An unknown error has occurred getting image data to URL from canvas');
                            log.debug(e);
                            next({});
                        }
                    });
                },(err)=>{
                    log.error('Failed to load image: ' + err);
                    next({});
                });
            } else {
                next({
                    raw: -1,
                    normalized: -1
                });
            }
        });
    }
};

function filterRegion(area, ctx){
    if (area && area!==''){
        ctx.beginPath();
        let coords = area.split(',');
        ctx.moveTo(parseInt(coords[0]),parseInt(coords[1]));
        for (let i = 2; i < coords.length; i+=2) {
            ctx.lineTo(parseInt(coords[i]),parseInt(coords[i+1]));
        }
        ctx.closePath();
        //ctx.strokeStyle='red';
        //ctx.stroke();
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
