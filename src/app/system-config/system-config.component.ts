import {Component, OnInit, Input, EventEmitter, Output} from '@angular/core';
import {SystemConfigService} from "../system-config.service";
import {MonitorsService} from "../monitors.service";
import {BsModalService} from "ngx-bootstrap/modal";
import {BsModalRef} from "ngx-bootstrap/modal/bs-modal-ref.service";

@Component({
    selector: 'app-system-config',
    templateUrl: './system-config.component.html',
    styleUrls: ['./system-config.component.css']
})
export class SystemConfigComponent implements OnInit {
    @Output() doSave = new EventEmitter<any>();
    modalRef: BsModalRef;
    closeResult: string;
    workingStorageAlias = '';
    workingStoragePath = '';
    dbConfig:any = {};
    monitors = {};
    errorMsg = null;
    scs:SystemConfigService;
    hideFooter: Boolean = false;
    userList:any = [];
    selectedUser: any = {};
    userEditMode:string = 'Add New User';
    userEditModeButton:string = 'Save New User';
    userErrors = [];

    constructor(private modalService: BsModalService, private systemConfigService: SystemConfigService) {
        this.scs = systemConfigService;
    }

    ngOnInit() {
    }

    tabChange(selectedTab){
        if (selectedTab == 'users') {
            this.scs.getUsers();
            this.hideFooter = true;
        } else {
            this.hideFooter = false;
        }
    }

    deleteUser(){
        if (confirm('Are you sure you want to delete: ' + this.selectedUser.login)) {
            this.scs.deleteUser(this.selectedUser._id);
            this.cancelEdit();
        }
    }

    saveUser(){
        this.userErrors = [];
        if (!this.selectedUser._id){
            console.log('New User: ' + this.selectedUser.login);
            if (!this.selectedUser.newPassword1 || this.selectedUser.newPassword1 == ''){
                this.userErrors.push('Password Cannot be blank for new User');
            }
        } else {
            console.log('Add New User: ' + this.selectedUser.login)
        }
        if (this.selectedUser.newPassword1 !== this.selectedUser.newPassword2){
            this.userErrors.push('Password and Confirm Password must match');
        }
        if (!this.selectedUser.firstName || this.selectedUser.firstName == ''){
            this.userErrors.push('First Name Cannot be blank');
        }
        if (!this.selectedUser.lastName || this.selectedUser.lastName == ''){
            this.userErrors.push('Last Name cannot be blank');
        }
        if (!this.selectedUser.login || this.selectedUser.login == ''){
            this.userErrors.push('Username cannot be blank and must be a valid email address');
        }
        if (!this.selectedUser.authLevel || this.selectedUser.authLevel == ''){
            this.userErrors.push('Please choose an Authorization Level');
        }
        if (this.userErrors.length == 0){
            this.scs.addOrUpdateUser(this.selectedUser);
            this.cancelEdit();
        } else {
            console.log('Form input errors Found, cannot save');
        }

    }

    editUser(){
        this.userEditMode = 'Edit User: ' + this.selectedUser.firstName + ' ' + this.selectedUser.lastName;
        this.userEditModeButton = 'Save Changes';
    }

    cancelEdit(){
        this.selectedUser = [];
        this.userEditMode = 'Add New';
        this.userEditModeButton = 'Save New User';
    }

    getAccessLevelText(level){
        if (level === 10){
            return 'Administrator'
        } else if (level == 5){
            return 'Standard User';
        } else if (level ==1) {
            return 'Terminal User';
        }

    }

    doHouseKeeping(){
        this.scs.doHouseKeeping();
    }

    removeLocation(i) {
        this.dbConfig['storageLocations'].splice([i], 1);
    }

    addLocation() {
        this.errorMsg = null;
        if (this.workingStoragePath != '' && this.workingStorageAlias != '') {
            this.dbConfig['storageLocations'].push({name: this.workingStorageAlias, path: this.workingStoragePath});
        } else {
            this.errorMsg = 'Please provide a valid Storage name and Path';
        }
    }

    save() {
        this.scs.saveNewConfig(this.dbConfig, this.monitors);
        this.modalRef.hide();
    }

    open(template) {
        this.dbConfig = this.scs.dbConfig;
        this.monitors = this.scs.monitors;
        this.userList = this.scs.userList;

        this.modalRef = this.modalService.show(template, {class: 'modal-lg'});
    }


}
