import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JspegComponent } from './jspeg.component';

describe('JspegComponent', () => {
  let component: JspegComponent;
  let fixture: ComponentFixture<JspegComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JspegComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JspegComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
