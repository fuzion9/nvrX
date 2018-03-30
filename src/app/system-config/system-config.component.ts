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

    constructor(private modalService: BsModalService, private systemConfigService: SystemConfigService) {
    }

    ngOnInit() {
    }

    doHouseKeeping(){
        this.systemConfigService.doHouseKeeping();
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
        this.systemConfigService.saveNewConfig(this.dbConfig, this.monitors);
        this.modalRef.hide();
    }

    open(template) {
        this.dbConfig = this.systemConfigService.dbConfig;
        this.monitors = this.systemConfigService.monitors;

        this.modalRef = this.modalService.show(template, {class: 'modal-lg'});
    }


}
