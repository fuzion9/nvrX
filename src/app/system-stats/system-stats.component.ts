import { Component, OnInit, AfterViewInit } from '@angular/core';
import {StreamControlService} from "../stream-control.service";

@Component({
  selector: 'app-system-stats',
  templateUrl: './system-stats.component.html',
  styleUrls: ['./system-stats.component.css']
})
export class SystemStatsComponent implements OnInit, AfterViewInit {
    stats = {};
    guageType = 'semi';
    guageSize = 85;
    guages:any = {mem:{}, cpu:{}};

  constructor(private scs:StreamControlService) { }

  ngOnInit() {
      this.scs.getSystemStats();
      this.scs.lastSystemStats.subscribe((data)=>{
          console.log(data);
          if (data.totalMem) {
              this.processData(data);
          }

      })
  }
  ngAfterViewInit(){
      let labels = document.getElementsByClassName('reading-label');
      for (let i=0; i < labels.length; i++){
          let e = <HTMLElement>labels[i];
          e.style.fontSize='8px';
          e.style.lineHeight='95px'
      }
      labels = document.getElementsByClassName('reading-block');
      for (let i=0; i < labels.length; i++){
          let e = <HTMLElement>labels[i];
          e.style.lineHeight='65px';
      }
  }

  processData(data){
      let mem = data.totalMem.split(' ');
      let memfree = data.freeMem.split(' ');
      this.guages.mem.totalMem = parseFloat(mem[0]);
      this.guages.mem.usedMem = this.guages.mem.totalMem - memfree[0];
      this.guages.mem.append = '/'+ data.totalMem; //mem[1];
      this.guages.mem.label = 'Memory Usage';

      this.guages.cpu.label = 'CPU Usage';
      this.guages.cpu.append = '%';
      this.guages.cpu.value = parseInt(data.cpuPercent);

  }

}
