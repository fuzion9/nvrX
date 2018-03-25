import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {HttpClient} from "@angular/common/http";
import {HttpHeaders} from '@angular/common/http';

@Injectable()
export class AuthService {
    isLoggedIn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    user: any = {};
    loginStatus: BehaviorSubject<string> = new BehaviorSubject(null);
    httpOptions = {headers: null};

    constructor(private http: HttpClient) {
        this.readLocalStorage();
        if (this.user.jwt) {
            let now = new Date();
            let expires = new Date(this.user.expires);
            if (now > expires) {
                this.doLogout();
            } else {
                this.httpOptions.headers = new HttpHeaders({
                    'Content-Type': 'application/json',
                    'Authorization': this.user.jwt
                });
                this.http.get('/api/getLatestUserData', this.httpOptions).subscribe((data: any) => {
                    console.log(data);
                    this.user.sortOrder = data.sortOrder;
                        this.isLoggedIn.next(true);
                    },
                    (err) => {
                        console.log(err);
                        this.isLoggedIn.next(true);
                    })
            }
        }
    }

    doLogout() {
        localStorage.clear();
        document.location.href = document.location.href;
    }

    doLogin(u, p) {
        this.http.post<any>('/loginAPI', {username: u, password: p}).subscribe(data => {
                console.log('Login Successful');
                this.setLocalStorage(data);
                this.httpOptions.headers = new HttpHeaders({
                    'Content-Type': 'application/json',
                    'Authorization': data.jwt
                });
                this.user = data;
                this.isLoggedIn.next(true);
            },
            response => {
                if (response.status === 401) {
                    this.loginStatus.next('Unauthorized: Bad username or password.');
                    this.httpOptions.headers = {};
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
        console.log(data);
        localStorage.setItem('id', data.id);
        localStorage.setItem('expires', data.expires);
        localStorage.setItem('tokenDate', data.tokenDate);
        localStorage.setItem('username', data.username);
        localStorage.setItem('jwt', data.jwt);
    }

}
