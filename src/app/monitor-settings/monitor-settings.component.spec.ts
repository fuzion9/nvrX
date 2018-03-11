import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorSettingsComponent } from './monitor-settings.component';

describe('MonitorSettingsComponent', () => {
  let component: MonitorSettingsComponent;
  let fixture: ComponentFixture<MonitorSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitorSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
