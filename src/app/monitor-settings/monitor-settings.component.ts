import {Component, OnInit, Input, EventEmitter, Output} from '@angular/core';
import {SystemConfigService} from "../system-config.service";
import {FormBuilder, FormGroup} from "@angular/forms";
import {MonitorsService, Monitor} from "../monitors.service";
import {BsModalService} from "ngx-bootstrap/modal";
import {BsModalRef} from "ngx-bootstrap/modal/bs-modal-ref.service";


@Component({
    selector: 'app-monitor-settings',
    templateUrl: './monitor-settings.component.html',
    styleUrls: ['./monitor-settings.component.css']
})
export class MonitorSettingsComponent implements OnInit {
    @Input() monitorDetails: Monitor = new Monitor();
    @Input() launcherStyle = 'icon';
    modalRef: BsModalRef;
    monitorEditor: FormGroup;
    availableClones=[];
    selectedClone: any;

    dbConfig:any = {};

    constructor(private modalService: BsModalService, private systemConfigService: SystemConfigService, private fb: FormBuilder, private monitorsService: MonitorsService) {
    }

    probeCamera() {
        this.monitorsService.probeMonitor(this.monitorDetails);
    }

    buildForm() {
        this.monitorEditor = this.fb.group({
            name: this.monitorDetails.alias,
            type: this.monitorDetails.type,
            username: this.monitorDetails.username,
            password: this.monitorDetails.password,
            port: this.monitorDetails.port,
            path: this.monitorDetails.path,
            host: this.monitorDetails.host,
            calculatedStreamPath: {value: this.monitorDetails.calculatedStreamPath, disabled: true},
            mode: this.monitorDetails.config.mode,
            hwaccel: this.monitorDetails.config.input.hwaccel,
            rtsp_transport: this.monitorDetails.config.input.rtsp_transport,
            recordLocation: this.monitorDetails.recordLocation,
            ssLocation: this.monitorDetails.snapShotLocation,
            vcodec: this.monitorDetails.config.recordOutput.vcodec,
            r: this.monitorDetails.config.recordOutput.r,
            segment_time: this.monitorDetails.config.recordOutput.segment_time,
            s: this.monitorDetails.config.motionConfig.s,
            enableMotionDetection: this.monitorDetails.config.motionConfig.enableMotionDetection

        })
    }


    open(template) {
        this.getCurrentMonitors();
        this.dbConfig = this.systemConfigService.dbConfig;
        if (!this.monitorDetails.config) {
            this.monitorDetails = this.buildDefaultCameraObject();
        }
        this.buildForm();
        this.modalRef = this.modalService.show(template, {class: 'modal-lg'});
    }

    doSave(){
        this.monitorsService.configChangeAndRestartMonitor(this.monitorDetails);
        this.modalRef.hide();
    }

    doSaveNoRestart(ev) {
        console.log('Minor Change: ' + ev);
        console.log(this.monitorDetails);
        this.monitorsService.configChange(ev, this.monitorDetails._id, this.monitorDetails);
    }

    getCurrentMonitors(){
        for (let m in this.monitorsService.currentMonitors) {
            this.availableClones.push(this.monitorsService.currentMonitors[m].value);
        }
    }

    doClone(){
        //console.log(this.selectedClone);
        this.monitorDetails.alias  = this.selectedClone.alias + " [Clone]";
        this.monitorDetails.config  = this.selectedClone.config;
        this.monitorDetails.host  = this.selectedClone.host;
        this.monitorDetails.isDisplayed  = false;
        this.monitorDetails.username  = this.selectedClone.username;
        this.monitorDetails.password  = this.selectedClone.password;
        this.monitorDetails.path  = this.selectedClone.path;
        this.monitorDetails.port  = this.selectedClone.port;
        this.monitorDetails.type  = this.selectedClone.type;
        this.monitorDetails.snapShotLocation  = this.selectedClone.snapShotLocation;
    }

    ngOnInit() {}

    buildDefaultCameraObject() {
        let m = this.monitorDetails;
        m.active = true;
        m.isDisplayed = false;
        m.recordLocation = this.dbConfig['storageLocations'][0].name;
        m.snapShotLocation = this.dbConfig['storageLocations'][0].name;
        m.alias = '';
        m.type = 'rtsp';
        m.host = '';
        m.username = '';
        m.password = '';
        m.port = '554';
        m.path = '';
        m.config = <any>{
            mode: "disabled",
            motionConfig: {
                enableMotionDetection: false,
                drawDiffBox: false,
                showMotionLevel: false,
                threshold: 10,
                eventTriggerPercent: 20,
                motionDelay: 30,
                motionArea: '',
                motionAreaPixelCount: 0,
                motionNormalizer: 10,
                eventDetectionMin: 20,
                s: ''
            },
            input: <any>{
                hwaccel: 'none',
                rtsp_transport: 'tcp'
            },
            recordOutput: <any> {
                vcodec: 'copy',
                r: 15,
                segment_time: 900
            }
        };
        m.ffProbe = {};
        return m;
    }

}
