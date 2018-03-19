import {Component, OnInit} from '@angular/core';
import {StreamControlService} from "../stream-control.service";

@Component({
    selector: 'app-system-stats',
    templateUrl: './system-stats.component.html',
    styleUrls: ['./system-stats.component.css']
})
export class SystemStatsComponent implements OnInit {
    stats = {};
    statData = false;
    guageType = 'semi';
    guageSize = 85;
    guages: any = {mem: {}, cpu: {}, disk: []};

    constructor(private scs: StreamControlService) {
    }

    ngOnInit() {
        this.scs.getSystemStats();
        this.scs.lastSystemStats.subscribe((data) => {
            if (data.totalMem) {
                this.processData(data);
            }

        })
    }

    reAlignGauges() {
        setTimeout(() => {
            let labels = document.getElementsByClassName('reading-label');
            for (let i = 0; i < labels.length; i++) {
                let e = <HTMLElement>labels[i];
                e.style.fontSize = '8px';
                e.style.lineHeight = '95px'
            }
            labels = document.getElementsByClassName('reading-block');
            for (let i = 0; i < labels.length; i++) {
                let e = <HTMLElement>labels[i];
                e.style.lineHeight = '65px';
            }
        }, 100);
    }

    processData(data) {
        let mem = data.totalMem.split(' ');
        let memfree = data.freeMem.split(' ');
        this.guages.mem.totalMem = parseFloat(mem[0]);
        this.guages.mem.usedMem = this.guages.mem.totalMem - memfree[0];
        this.guages.mem.append = '/' + data.totalMem; //mem[1];
        this.guages.mem.label = 'Memory Usage';

        this.guages.cpu.label = 'CPU Usage';
        this.guages.cpu.append = '%';
        this.guages.cpu.value = parseFloat(data.cpuPercent);


        for (let i = 0; i < data.disk.length; i++) {
            let thisDrive = data.disk[i];
            if (this.guages.disk[i]) {
                this.guages.disk[i].value = 100 - parseFloat(thisDrive.freePercent);
            } else {
                let g = {
                    label: 'Used on: ' + thisDrive.volume,
                    value: 100 - parseFloat(thisDrive.freePercent),
                    append: '%' // / ' + thisDrive.totalSpace
                };
                this.guages.disk.push(g);
            }
        }
        if (!this.statData){
            this.statData = true;
            this.reAlignGauges();
        }
    }

}
