import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs/Subject';
import {Socket} from 'ng-socket-io';

@Injectable()
export class StreamControlService {

  lastPacket:Date = new Date();
  confidence:any = 0;

  monitors={};

  constructor(private socket: Socket) {
    this.startSocketListener();
  }

  startMonitor(id) {
    if (!this.monitors[id]){
        this.monitors[id] = {};
        this.monitors[id].stream = new Subject<any>();
        this.startStream(id);
        //console.log('Created New Stream Subject: ' + id );
    } else {
      this.startStream(id);
    }
  }
  startStream(id){
    this.socket.emit('startStream', {id: id});
    //this.socket.emit('startStream', {id: '5a8b4660ad4bdbe250f8a40a'});
  }

  stopMonitor(id) {
    this.socket.emit('stopStream', {id: id});
  }



  startSocketListener(){
    this.socket.on('h264', (data) => {
      if (!this.monitors[data.feed]) {
        console.log('Unknown Feed: ' +data.feed);
      } else {
        data.lastPacket = new Date();
        this.monitors[data.feed].stream.next(data);

      }
    })
  }
}
