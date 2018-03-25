import {Component} from '@angular/core';
import {MonitorsService} from "./monitors.service";
import {SystemConfigService} from "./system-config.service";
import {AuthService} from "./auth.service";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    isCollapsed = false;

    simpleDrop: any = null;
    dragOperation: boolean = false;
    monitorsAvailable = [];
    monitorsDisplayed = [];
    dbConfig:any = {};
    auth: AuthService;
    monitorsPerLine = 4;
    colSize = 4;

    constructor(private monitorService: MonitorsService, private systemConfigService: SystemConfigService, private a: AuthService) {
        systemConfigService.changeSubject.subscribe(value => {
            if (value){
                this.dbConfig = systemConfigService.dbConfig;
            }
        });
        this.auth = a;
        this.initAfterLogin();
    }


    setColumns(n){
        this.dbConfig.monitorsPerRow = 12 / n;
        this.systemConfigService.updateConfigValue('monitorsPerRow', this.dbConfig.monitorsPerRow);
    }

    initAfterLogin(){
        this.monitorService.monitorServiceStatus.subscribe((status)=>{
            if (status === 'Initialized'){
                for (let m in this.monitorService.currentMonitors) {
                    if (this.monitorService.currentMonitors[m].value.isDisplayed){
                        this.monitorsDisplayed.push(m);
                    } else {
                        this.monitorsAvailable.push(m);
                    }
                }

                if (this.a.user.sortOrder){
                    console.log('Using Custom Sort Order');
                    this.monitorsDisplayed = this.a.user.sortOrder;
                } else {
                    console.log('Using Default Sort Order');
                }
            }
        });
    }


    toggleMenu() {
        this.isCollapsed = !this.isCollapsed;
    }

    activate($event: any) {
        console.log(this.monitorsDisplayed);
        this.monitorService.setDisplay($event, true, this.monitorsDisplayed);
    }

    deActivate($event: any) {
        this.monitorService.setDisplay($event, false, this.monitorsDisplayed);
    }
}
