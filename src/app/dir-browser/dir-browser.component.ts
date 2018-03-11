import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {BsModalService} from "ngx-bootstrap/modal";
import {BsModalRef} from "ngx-bootstrap/modal/bs-modal-ref.service";
import {HttpClient} from "@angular/common/http";
import {AuthService} from "../auth.service";

@Component({
    selector: 'app-dir-browser',
    templateUrl: './dir-browser.component.html',
    styleUrls: ['./dir-browser.component.css']
})
export class DirBrowserComponent implements OnInit {
    modalRef: BsModalRef;
    @Input()currDir:any;
    @Output()currDirChange = new EventEmitter();
    currDirContents:any;
    windowsDriveLetter:any = "C:";
    availWindowsDrives= [];
    os:any;
    auth:AuthService;

    constructor(private modalService: BsModalService, private http: HttpClient, private a:AuthService) {
        this.auth = a;
    }

    ngOnInit() {
        if (typeof this.currDir == 'string'){
            if (this.currDir.indexOf('\\')){
                //windows
                this.currDir = this.currDir.split('\\')
            } else {
                this.currDir = this.currDir.split('/')
                //linux
            }
        }
    }

    selectDir(){
        let newDirectory = '';
        if (this.availWindowsDrives.length > 0) {
            for (let i=0; i < this.currDir.length; i++) newDirectory+=this.currDir[i] + '\\';
        } else {
            for (let i=0; i < this.currDir.length; i++) newDirectory+=this.currDir[i] + '/';
        }
        newDirectory = newDirectory.substr(0, newDirectory.length-1);
        newDirectory = newDirectory.replace(/\\\\/g, '\\');
        this.currDirChange.emit(newDirectory);
        this.modalRef.hide();
    }

    changeDir(drive){
        this.currDir = [];
        this.getDirData(drive, null);
    }

    getDirData(folder, upLevel){
        if (upLevel){
            this.currDir.pop();
        } else {
            if (folder && folder != '') {
                console.log('Pushing: ' + folder);
                this.currDir.push(folder);
            }
        }
        this.http.post<any>('/api/v1/fbrowse', {folder: this.currDir}, this.auth.httpOptions).subscribe(data => {
            this.currDir = data.dir;
            this.currDirContents = data.contents;
            this.availWindowsDrives = data.drives;
            this.os = data.os;
        });
    }

    currDirDisplay(){
        if (typeof this.currDir !== 'string') {
            if (this.os == 'win32') {
                return this.currDir.join('\\').replace('\\\\', '\\');
            } else {
                return this.currDir.join('/').replace('//', '/');
            }
        } else {
            return this.currDir;
        }

    }

    open(template) {
        this.ngOnInit();
        this.getDirData(null, false);
        this.modalRef = this.modalService.show(template, {class: 'modal-lg'});
    }
}
