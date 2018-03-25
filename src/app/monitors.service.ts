import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {AuthService} from "./auth.service";

@Injectable()
export class MonitorsService {
    currentMonitors = {};
    auth: AuthService;
    monitorServiceStatus:Subject<any> = new Subject<any>();
    busy = new Subject();

    constructor(private http: HttpClient, private a: AuthService) {
        this.auth = a;
        this.monitorServiceStatus.next('Startup');
        this.auth.isLoggedIn.subscribe(value => {
            if (value){
                this.initAfterLogin();
            }
        })
    }

    initAfterLogin(){
        this.http.get<Monitor[]>('/api/monitorList', this.auth.httpOptions).subscribe((data) => {
            this.monitorServiceStatus.next('Initializing');
            for (let m in data){
                this.currentMonitors[data[m]._id] = new BehaviorSubject(data[m]);
            }
            this.monitorServiceStatus.next('Initialized');
            //console.log(this.currentMonitors);
        });
    }

    ptzAction(id, action){
        console.log(id + ': ' + action);
        this.http.get('/api/ptzAction/' + id + '/' + action, this.auth.httpOptions).subscribe(data => {
            console.log('Action Complete');
        });

    }

    setDisplay(id, val, displayOrder){
        let thisM = this.currentMonitors[id].value;
        thisM.isDisplayed = val;
        this.http.post('/api/updateMonitor/minor/' + id, thisM, this.auth.httpOptions).subscribe(data => {
            this.currentMonitors[id].next(thisM);
            let payload:any = {};
            payload.newOrder = displayOrder;
            this.http.post('/api/updateUserSortOrder', payload, this.auth.httpOptions).subscribe(data => {
              //
            })
        });

    }

    probeMonitor(monitor){
        this.busy.next({id: monitor._id, value: true});
        this.http.post('/api/probeMonitor',  monitor, this.auth.httpOptions).subscribe(data => {
            if (data['config'].motionConfig.s == '') data['config'].motionConfig.s = data['ffProbe'].streams[0].width + 'x' + data['ffProbe'].streams[0].height;
            this.currentMonitors[monitor._id].next(data);
        });
    }

    configChange(type, monitorId, monitorDetails) {
        this.busy.next({id:monitorId, value: true});
        this.http.post('/api/updateMonitor/'+type + '/' + monitorId, monitorDetails, this.auth.httpOptions).subscribe(data => {
            //console.log(data['monitorDetails'].config.motionConfig);
        });
    }

    configChangeAndRestartMonitor(monitorDetails) {
        this.busy.next({id: monitorDetails._id, value: true});
        console.log('Monitor Service Requested to Saving Monitor Config to Database');
        this.http.post('/api/updateMonitorAndRestart/' + monitorDetails._id, monitorDetails, this.auth.httpOptions).subscribe((data:any) => {
            if (data.result){
                console.log('Updated Monitor:' + data.monitorDetails.alias);
                this.currentMonitors[monitorDetails._id].next(data.monitorDetails);
            } else {
                console.log('Monitor Update Failed');
            }
        });
    }
}

export class Monitor{
    _id : string;
    active : boolean;
    isRunning : boolean;
    isDisplayed : boolean;
    recordLocation : string;
    snapShotLocation : string;
    alias : string;
    type : string;
    host : string;
    username : string;
    password : string;
    port : string;
    path : string;
    calculatedRecordingLocation : string;
    pid : number;
    calculatedStreamPath : string;
    config: Config;
    ffProbe: any;
}

class Config{
    mode: string;
    motionConfig: MotionConfig;
    input: Input;
    recordOutput: RecordOutput;
}

class RecordOutput{
    vcodec : string;
    r : number;
    segment_time :number;
}

class Input{
    hwaccel : string;
    rtsp_transport : string;
}

class MotionConfig{
    enableMotionDetection : boolean;
    drawDiffBox : boolean;
    showMotionLevel : boolean;
    threshold : number;
    eventTriggerPercent: number;
    motionDelay : number;
    motionArea : number;
    motionAreaPixelCount : number;
    motionNormalizer : number;
    eventDetectionMin : number;
    s : string;
    newCanvas : boolean;
    calculatedSnapShotLocation : string;
}
