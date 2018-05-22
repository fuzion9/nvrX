import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {HttpClient} from "@angular/common/http";
import {HttpHeaders} from '@angular/common/http';
import {TimeInterval} from "rxjs/Rx";

@Injectable()
export class AuthService {
    isLoggedIn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    user: any = {};
    loginStatus: BehaviorSubject<string> = new BehaviorSubject(null);
    secondsTillTokenExpires = 0;
    private _httpOptions = {headers: null};
    private expireCheckInterval;
    get httpOptions(){
        let now = new Date();
        //console.log(now);
        let expires = new Date(this.user.expires);
        //console.log(expires);
        //let secondsTillTokenExpires = expires.getTime() - now.getTime(); // / 1000;
        //console.log('Token Expires in ' + AuthService.convertMillisToTime(secondsTillTokenExpires) + ' seconds. [' + secondsTillTokenExpires +']');
        if (now > expires) {
            console.log('Token Expired');
            this.doLogout();
            return null;
        } else {
            return this._httpOptions;
        }
    }

    constructor(private http: HttpClient) {
        this.checkUser();
    }

    checkUser(){
        this.readLocalStorage();
        if (this.user.jwt) {
            let now = new Date();
            let expires = new Date(this.user.expires);
            if (now > expires) {
                this.doLogout();
            } else {
                this._httpOptions.headers = new HttpHeaders({
                    'Content-Type': 'application/json',
                    'Authorization': this.user.jwt
                });
                this.http.get('/api/getLatestUserData', this.httpOptions).subscribe((data: any) => {
                        if (data.msLeft < 86400000) { //dont even run this if the time is longer than 10 days.
                            console.log('You will be logged out in ' + Math.floor(data.msLeft / 1000) + ' seconds. [' + data.msLeft + ' ms]');
                            this.expireCheckInterval = setTimeout(() => {
                                console.log('Logout Initiated due to token expiry');
                                this.doLogout();
                            }, data.msLeft);
                        }
                        this.user.sortOrder = data.sortOrder;
                        this.isLoggedIn.next(true);
                    },
                    (err) => {
                        console.log(err);
                        this.isLoggedIn.next(false);
                    })
            }
        }
    }

    doLogout() {
        localStorage.clear();
        document.location.href = document.location.href;
    }

    setUserDataFromLogin(data){
        this.user = data;
    }

    doLogin(u, p) {
        this.http.post<any>('/loginAPI', {username: u, password: p}).subscribe(data => {
                this.setLocalStorage(data);
                this._httpOptions.headers = new HttpHeaders({
                    'Content-Type': 'application/json',
                    'Authorization': data.jwt
                });
                this.setUserDataFromLogin(data);
                //this.isLoggedIn.next(true);
                this.checkUser();
            },
            response => {
                if (response.status === 401) {
                    this.loginStatus.next('Unauthorized: Bad username or password.');
                    this._httpOptions.headers = {};
                    localStorage.clear();
                    this.user = {};
                } else {
                    this.loginStatus.next('An unknown error has occurred, please try again');
                }
            });
    }

    readLocalStorage() {
        this.user.id = localStorage.getItem('id');
        this.user.expires = localStorage.getItem('expires');
        this.user.tokenDate = localStorage.getItem('tokenDate');
        this.user.username = localStorage.getItem('username');
        this.user.jwt = localStorage.getItem('jwt');
    }

    setLocalStorage(data) {
        localStorage.setItem('id', data.id);
        localStorage.setItem('expires', data.expires);
        localStorage.setItem('tokenDate', data.tokenDate);
        localStorage.setItem('username', data.username);
        localStorage.setItem('jwt', data.jwt);
    }

    static convertMillisToTime(millis){
        let delim = " ";
        let hours = Math.floor(millis / (1000 * 60 * 60) % 60);
        let minutes = Math.floor(millis / (1000 * 60) % 60);
        let seconds = Math.floor(millis / 1000 % 60);
        let h = hours < 10 ? '0' + hours : hours;
        let m = minutes < 10 ? '0' + minutes : minutes;
        let s = seconds < 10 ? '0' + seconds : seconds;
        return h + 'h'+ delim + m + 'm' + delim + s + 's';
    }

}
