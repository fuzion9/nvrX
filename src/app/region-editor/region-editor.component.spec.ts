import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionEditorComponent } from './region-editor.component';

describe('RegionEditorComponent', () => {
  let component: RegionEditorComponent;
  let fixture: ComponentFixture<RegionEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RegionEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegionEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
