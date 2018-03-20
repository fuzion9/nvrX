import {Component, OnInit, AfterViewInit, Input} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {StreamControlService} from '../stream-control.service';
import {MonitorsService} from "../monitors.service";

declare var JSMpeg: any;


@Component({
    selector: 'app-jspeg',
    templateUrl: './jspeg.component.html',
    styleUrls: ['./jspeg.component.css']
})
export class JspegComponent implements OnInit, AfterViewInit {
    @Input() monitorId: string;
    @Input() colSize: number;
    debug = false;
    stateChanging:any = true;
    jsm = JSMpeg;
    framecount: number = 0;
    dataSubscription: Subscription;
    pixelArea: number;
    normalizer: number;
    threshold: number;
    confidence: number;
    rawConfidence: number;
    connectionInterval: any;
    connectionTimeout: any = 2000;
    monitorDetails: any = {
        isDisplayed: false,
        alias: 'Loading...',
        motionArea: null,
        config: {
            motionConfig: {
                drawDiffBox: false,
                enableMotionDetection: false,
                showMotionLevel: false
            },
            mode: 'disconnected'
        }
    };
    canvas: HTMLElement;
    isRunning: false;
    isPlaying: boolean = false;
    showDiffImages: boolean = true;
    diffElement: HTMLImageElement;
    player: any;
    snapshotUrl = '';
    stacked: any[] = [];
    //detectionDelay = '0';


    constructor(private monitorService: MonitorsService, private SCS: StreamControlService) {
        //this.debug = true;
        monitorService.busy.subscribe((state:any)=>{
            if (state.id == this.monitorId) {
                this.stateChanging = state.value;
                this.framecount = 0;
                console.log('StateChanging: ' + state);
            }
        })
    }

    ptzAction(action){
        this.monitorService.ptzAction(this.monitorId, action);
    }


    ngOnInit() {
        this.monitorService.currentMonitors[this.monitorId].subscribe((mDetails) => {
            this.monitorDetails = mDetails;
            this.stacked.push({value:mDetails.config.motionConfig.eventTriggerPercent, type:'warning', label:mDetails.config.motionConfig.eventTriggerPercent + '%'});
            this.stacked.push({value:0, type:'danger', label:''});
            if (mDetails.isDisplayed) {
                this.displayMonitor();
            } else {
                this.stopMonitor();
            }
        });

    }

    ngAfterViewInit() {
        //console.log(this.snapshotUrl);

    }

    displayMonitor() {
        setTimeout(() => {
            this.getPlayer(() => {
                this.startSubscription();
            });
        }, 100)
    }

    startSubscription() {
        this.startMonitor();
        this.dataSubscription = this.SCS.monitors[this.monitorId].stream.subscribe((newData) => {
            this.framecount++;


            if (newData.confidence) {
                this.setProgressStack(this.confidence);
                this.rawConfidence = newData.confidence.raw;
                this.pixelArea = newData.confidence.motionAreaSize;
                this.normalizer = newData.confidence.normalizer;
                this.threshold = newData.confidence.threshold;
                this.confidence = newData.confidence.normalized;
            }

            //this.detectionDelay = newData.detectionDelay;
            this.isRunning = newData.isRunning;
            if (this.framecount > 10) this.stateChanging = false;
            if (this.monitorDetails.config.motionConfig.drawDiffBox && this.confidence > 0 && this.diffElement.src) {
                this.diffElement.src = '/streamIn/diffImage/' + this.monitorId + '?' + new Date().getTime();
            }
            this.player.write(newData.buffer, () => {
            });
            this.fitCanvas();
        });
    }

    setProgressStack(confidence){
        let trigger = this.monitorDetails.config.motionConfig.eventTriggerPercent;
        let nCon = this.confidence - trigger;
        if (confidence > trigger) {
            this.stacked[0].value = trigger;
            this.stacked[0].label = '';
            this.stacked[1].value = nCon;
            if (confidence > trigger) {
                this.stacked[1].label = this.confidence + '%';
            } else {
                this.stacked[1].label = '';
            }
        } else {
            this.stacked[1].value = 0;
            this.stacked[1].label = '';
            this.stacked[0].value = confidence;
            if (this.confidence > 2) {
                this.stacked[0].label = this.confidence + '%';
            } else {
                this.stacked[0].label = '';
            }
        }

    }

    startMonitor() {
        this.SCS.startMonitor(this.monitorId);
        if (this.monitorDetails.config.mode != 'disabled') {
            this.isPlaying = true;
        }
    }

    stopMonitor() {
        this.SCS.stopMonitor(this.monitorId);
        this.isPlaying = false;
    }

    fitCanvas() {
        this.canvas.style.width = '100%';
        //canvas.style.height='100%';
        //this.canvas.width  = this.canvas.offsetWidth;
        //canvas.height = canvas.offsetHeight;
    }

    getPlayer(next) {
        let canvasElement = 'canvas_' + this.monitorId;
        if (!this.canvas) {
            this.canvas = document.getElementById(canvasElement);
            this.diffElement = <HTMLImageElement>document.getElementById('diffImage_' + this.monitorId);
            if (this.canvas) {
                this.player = new this.jsm.Player('pipe', {
                    canvas: this.canvas,
                    audio: false
                });
                this.fitCanvas();
            } else {
                console.log('Could not locate canvas: ' + canvasElement);
            }
            next();
        } else {
            next();
        }
    }

    doSaveNoRestart(ev) {
        console.log('Minor Change: ' + ev);
        console.log(this.monitorDetails);
        this.monitorService.configChange(ev, this.monitorId, this.monitorDetails);
    }

    /*
    configChangeAndRestartMonitor() {
        this.stateChanging = true;
        this.framecount = 0;
        this.monitorService.configChangeAndRestartMonitor(this.monitorId, this.monitorDetails);
    }
    */

    configChange() {
        this.stateChanging = true;
        this.monitorService.configChange('minor', this.monitorId, this.monitorDetails);
    }

}
