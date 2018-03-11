import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import {BsModalService} from "ngx-bootstrap/modal";
import {BsModalRef} from "ngx-bootstrap/modal/bs-modal-ref.service";


declare var jQuery: any;
declare var canvasAreaDraw: any;

@Component({
  selector: 'app-region-editor',
  templateUrl: './region-editor.component.html',
  styleUrls: ['./region-editor.component.css']
})
export class RegionEditorComponent implements OnInit {
    @Input() monitorDetails:any = {};
    modalRef: BsModalRef;

    @Output() monitorDetailsChange: EventEmitter<object> = new EventEmitter<object>();
    @Output() doSave = new EventEmitter<any>();
    closeResult: string;
    snapshotUrl = '';
    //coords = '261,130,413,131,413,258,261,257';
    coords = '';
    constructor(private modalService: BsModalService) {

    }

    calculateCoverageArea(){
        console.log(this.coords);
        let selectionArea = 0;
        let image = new Image();
        image.src = this.snapshotUrl;
        jQuery(image).load(this.snapshotUrl, ()=>{
            console.log(image.src + ': ' + image.width + ' x ' + image.height);
            if (this.coords !== '') {
                console.log('Calculating Coords');
                let calcCanvas = jQuery('<canvas style="border: 1px solid #000">');
                let ctx = calcCanvas[0].getContext('2d');
                calcCanvas.attr('height', image.height).attr('width', image.width);
                ctx.beginPath();
                let coords = this.coords.split(',');
                ctx.moveTo(parseInt(coords[0]), parseInt(coords[1]));
                for (let i = 2; i < coords.length; i += 2) {
                    ctx.lineTo(parseInt(coords[i]), parseInt(coords[i + 1]));
                }
                ctx.closePath();
                ctx.clip();
                for (let y = 0; y < image.height; y++) {
                    for (let x = 0; x < image.width; x++) {
                        if (ctx.isPointInPath(x, y)) {
                            selectionArea++;
                        }
                    }
                }
                this.monitorDetails.config.motionConfig.motionAreaPixelCount = selectionArea;
                let fullArea =  image.height * image.width;
                let percentCoverage = Math.round((selectionArea / fullArea) * 100) / 10;
                this.monitorDetails.config.motionConfig.motionNormalizer = percentCoverage;
            } else {
                console.log('Calculating Coords on Entire Image');
                this.monitorDetails.config.motionConfig.motionAreaPixelCount = image.height * image.width;
                this.monitorDetails.config.motionConfig.motionNormalizer = 10; //default for full image
            }
            jQuery('#normalization').val(this.monitorDetails.config.motionConfig.motionNormalizer);
        });
    }

    updateCoords(){
        this.coords = jQuery('#p').val();
        this.monitorDetails.config.motionConfig.motionArea = this.coords;
        this.monitorDetails.config.motionConfig.motionNormalizer = jQuery('#normalization').val();
        this.monitorDetails.config.motionConfig.threshold = jQuery('#threshold').val();
        this.monitorDetails.config.motionConfig.eventTriggerPercent = jQuery('#evt').val();
        this.monitorDetails.config.motionConfig.motionDelay = jQuery('#delay').val();
        console.log(this.monitorDetails.config.motionConfig);
        this.calculateCoverageArea();
    }

    saveCoords(){
        console.log('Emitting Save Event');
        this.calculateCoverageArea();
        this.doSave.emit('MotionOnlyChange');
        this.modalRef.hide();
    }


    ngOnInit() {
    }

    open(template) {
        if (this.monitorDetails.config.motionConfig.motionArea) {
            //console.log('Using Already Defined Coords');
            this.coords = this.monitorDetails.config.motionConfig.motionArea;
        } else {
            console.log('Using Default Coords');
        }
        //console.log(this.coords);
        //console.log('URL Before: ' + this.snapshotUrl);
        if (this.snapshotUrl == null || this.snapshotUrl == '') {
            this.snapshotUrl = window.location.href.replace('#', '') + 'streamIn/snapshot/' + this.monitorDetails._id;
        }
        console.log('URL After: ' + this.snapshotUrl);
        setTimeout(()=>{
            this.calculateCoverageArea();
            jQuery('#p').val(this.coords);
            jQuery('#normalization').val(this.monitorDetails.config.motionConfig.motionNormalizer);
            jQuery('#threshold').val(this.monitorDetails.config.motionConfig.threshold);
            jQuery('#evt').val(this.monitorDetails.config.motionConfig.eventTriggerPercent);
            jQuery('#delay').val(this.monitorDetails.config.motionConfig.motionDelay);
            jQuery('#p').canvasAreaDraw({imageUrl: this.snapshotUrl});

        }, 500);
        this.modalRef = this.modalService.show(template, {class: 'modal-lg'});

    }


}
