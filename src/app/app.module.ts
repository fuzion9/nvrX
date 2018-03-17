import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {FormsModule} from "@angular/forms";
import {HttpClientModule} from '@angular/common/http';

import {JWBootstrapSwitchModule} from 'jw-bootstrap-switch-ng2';
import {VgCoreModule} from "videogular2/core";
import { VgControlsModule } from "videogular2/controls";
import { VgOverlayPlayModule } from "videogular2/overlay-play";
import { VgBufferingModule } from 'videogular2/buffering';
import {DndModule} from 'ng2-dnd';
import {AppComponent} from './app.component';
import {VideoPlayerComponent} from './video-player/video-player.component';
import {SocketIoModule, SocketIoConfig} from 'ng-socket-io';
import {JspegComponent} from './jspeg/jspeg.component';
import {NgxGaugeModule} from 'ngx-gauge';
import {StreamControlService} from './stream-control.service';
import {AuthService} from './auth.service';
import {MonitorsService} from "./monitors.service";
import {MonitorSettingsComponent} from './monitor-settings/monitor-settings.component';
import {SystemConfigService} from "./system-config.service";
import {RegionEditorComponent} from './region-editor/region-editor.component';
import {SystemConfigComponent} from './system-config/system-config.component';
import {TableModule} from 'primeng/table';
import {PaginatorModule} from 'primeng/paginator';
import {
    ModalModule, BsDatepickerModule, ProgressbarComponent, DatepickerModule,
    ProgressbarModule, TooltipModule
} from 'ngx-bootstrap';
import { DirBrowserComponent } from './dir-browser/dir-browser.component';
import { LoginComponent } from './login/login.component';
import { SystemStatsComponent } from './system-stats/system-stats.component';

const config: SocketIoConfig = {url: '/', options: {secure: true}};

@NgModule({
    declarations: [
        AppComponent,
        VideoPlayerComponent,
        JspegComponent,
        MonitorSettingsComponent,
        RegionEditorComponent,
        SystemConfigComponent,
        DirBrowserComponent,
        LoginComponent,
        SystemStatsComponent
    ],
    imports: [
        HttpClientModule,
        BrowserModule,
        BrowserAnimationsModule,
        VgCoreModule,
        VgControlsModule,
        VgOverlayPlayModule,
        VgBufferingModule,
        ReactiveFormsModule,
        FormsModule,
        DndModule.forRoot(),
        SocketIoModule.forRoot(config),
        ModalModule.forRoot(),
        BsDatepickerModule.forRoot(),
        ProgressbarModule.forRoot(),
        TooltipModule.forRoot(),
        NgxGaugeModule,
        JWBootstrapSwitchModule,
        TableModule,
        PaginatorModule
    ],
    exports: [VgCoreModule],
    providers: [StreamControlService, MonitorsService, SystemConfigService, AuthService],
    bootstrap: [AppComponent]
})
export class AppModule {
}
