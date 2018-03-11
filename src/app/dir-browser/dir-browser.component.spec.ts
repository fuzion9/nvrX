import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DirBrowserComponent } from './dir-browser.component';

describe('DirBrowserComponent', () => {
  let component: DirBrowserComponent;
  let fixture: ComponentFixture<DirBrowserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DirBrowserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DirBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
