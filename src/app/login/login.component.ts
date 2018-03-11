import { Component, OnInit } from '@angular/core';
import {AuthService} from "../auth.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

    auth:AuthService;
    loginName:string;
    password:string;
    rememberMe:boolean;
    failedLoginMessage:string = null;

  constructor(private a:AuthService) {
      this.auth = a;
  }

  doLogin(){
      this.auth.doLogin(this.loginName, this.password);
      this.auth.loginStatus.subscribe(value => {
          this.failedLoginMessage = value;
      })
  }

  ngOnInit() {
  }

}
