import {Component, OnInit, Input, TemplateRef, Output} from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import {HttpClient} from "@angular/common/http";
import {VgAPI, VgFullscreenAPI} from 'videogular2/core';
import {AuthService} from "../auth.service";

declare var VTTCue;

//TODO: Hide motionless videos and provide a filter to turn them on / off
@Component({
    selector: 'app-video-player',
    templateUrl: './video-player.component.html',
    styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit {
    @Input() monitor;
    modalRef: BsModalRef;
    haveRowData: boolean = false;
    motionDetected = false;
    currentDate:Date = new Date();
    currentCues = [];
    seekTimes=[];
    api:VgAPI;
    fsAPI: VgFullscreenAPI;
    nativeFs: boolean = true;
    controls: boolean = false;
    sources: Array<Object> = [];
    track:TextTrack;
    selectedVideo

    columns = [{
        name: "filename",
        title: "Recorded Video"
    }, {
        name: "eventCount",
        title: "Events"
    }, {
        name: "date",
        title: "Time Recorded"
    }, {
        name: "meta.length",
        title: "Video Length"
    }
    ];
    rows:any = [];
    auth: AuthService;

    public config: any = {
        paging: true,
        sorting: {columns: this.columns},
        filtering: {filterString: ''},
        className: ['table-striped table-sm']
    };

    constructor(private modalService: BsModalService, private http: HttpClient, private a: AuthService) {
        this.auth = a;
        //this.sources.push({src:'http://static.videogular.com/assets/videos/videogular.mp4', type:'video/mp4'})
    }

    play(vid){
        this.clearCues();
        this.sources = [];
        this.seekTimes = [];
        this.sources.push({src: '/streamIn/vidFile/' + vid._id, type: 'video/mp4'});
        let vidStart = new Date(vid.startDate);
        for (let i = 0; i < vid.events.length; i++){
            let event = vid.events[i];
            let eventDate = new Date(event.date);
            console.log('Event Date: ' + eventDate);
            let cueTime = ((eventDate.getTime() - vidStart.getTime()) / 1000) - 1;
            cueTime = Math.round(cueTime);
            if (cueTime < 0) cueTime=0;
            this.seekTimes.push({offset: cueTime, eventTime: eventDate, confidence: event.data.normalized});
            const cue = new VTTCue(cueTime-.5, cueTime+6, 'Motion Detected');
            cue.addEventListener('enter', (event) => {
                this.onEnterCuePoint(event);
            });
            cue.addEventListener('exit', event => {
                this.onExitCuePoint(event);
            });
            this.currentCues.push(cue);

        }
        this.api.getDefaultMedia().subscriptions.ended.subscribe(
            () => {
            }
        );
        this.addCues();
        setTimeout(()=>{
            this.api.play();
        }, 200);

    }

    seekTo(seconds){
        console.log('Seekng to: ' + seconds);
        this.api.seekTime(seconds)
    }

    addCues(){
        for (let i = 0; i < this.currentCues.length; i++){
            this.track.addCue(this.currentCues[i]);
        }
    }

    clearCues(){
        for (let i = 0; i < this.currentCues.length; i++){
            try {
                this.track.removeCue(this.currentCues[i]);
            } catch (e){
                console.log('Cue not found, no need to remove');
            }
        }
        this.currentCues = [];
    }

    onClickRemove(cue: TextTrackCue) {
        this.track.removeCue(cue);
    }


    ngOnInit() {}

    getVids(){
        let payload = {monitorId: this.monitor._id, date: this.currentDate};
        let url = '/api/v1/vids';
        this.haveRowData = false;
        this.http.post(url, payload, this.auth.httpOptions).subscribe(data => {
            this.rows = data;
            this.haveRowData = true;
        })

    }



    changeDate(e) {
        this.currentDate = e;
        this.getVids();
        //console.log(e);
    }

    open(template: TemplateRef<any>) {
        this.getVids();
        this.modalRef = this.modalService.show(template, {class:'modal-lg modal-content', backdrop: "static"});
    }


    onEnterCuePoint($event) {
        this.motionDetected = true;
        //this.cuePointData = JSON.parse($event.text);
    }

    onExitCuePoint($event) {
        this.motionDetected = false;
        //this.cuePointData = null;
    }

    onPlayerReady(api:VgAPI) {
        this.api = api;
        this.track = this.api.textTracks[0];
    }


    shorten(f){
        if (f) {
            return f.split('\\').pop();
        } else {
            return '';
        }
    }


}
