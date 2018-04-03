import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs/Observable";
import 'rxjs/add/observable/of';
import {AuthService} from "./auth.service";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";

@Injectable()
export class SystemConfigService {
    dbConfig: any = {};
    monitors: any = {};
    changeSubject = new Subject();
    auth: AuthService;
    userList:BehaviorSubject<any> = new BehaviorSubject([]);

    constructor(private http: HttpClient, private a: AuthService) {
        this.auth = a;
        this.auth.isLoggedIn.subscribe(value => {
            if (value){
                this.initAfterLogin();
            }
        })
    }

    initAfterLogin(){
        this.http.get('/api/dbConfig', this.auth.httpOptions).subscribe(data => {
            this.dbConfig = data;
            this.http.get('/api/getEveryKnownMonitor', this.auth.httpOptions).subscribe(data => {
                this.monitors = data;
                this.changeSubject.next(true);
            })
        });

    }

    getUsers(){
        this.http.get('/api/userList', this.auth.httpOptions).subscribe(data => {
            this.userList.next(data);
        });
    }

    addOrUpdateUser(user){
        console.log('Performing Save');
        this.http.post('/api/addOrUpdateUser', user, this.auth.httpOptions).subscribe(data => {
            this.getUsers();
        });
    }

    deleteUser(id){
        console.log('Performing Save');
        this.http.get('/api/deleteUser/' + id, this.auth.httpOptions).subscribe(data => {
            this.getUsers();
        });
    }

    doHouseKeeping(){
        this.http.get('/api/doHouseKeeping', this.auth.httpOptions).subscribe(data => {
        })
    }

    updateConfigValue(key, value){
        this.dbConfig[key] = value;
        this.saveNewConfig(this.dbConfig, null);
    }

    saveNewConfig(newData, newMonitorData) {
        this.http.post('/api/updateSystemConfig/', newData, this.auth.httpOptions).subscribe(data => {
            console.log(data);
        });

        let activationupdate = [];
        for (let i = 0; i < newMonitorData.length; i++) {
            activationupdate.push({
                id: newMonitorData[i]._id,
                alias: newMonitorData[i].alias,
                active: newMonitorData[i].active
            });
        }
        this.http.post('/api/updateActivationStatus', activationupdate, this.auth.httpOptions).subscribe(data => {
            console.log(data);
        });
    }

}
