import { TestBed, inject } from '@angular/core/testing';

import { StreamControlService } from './stream-control.service';

describe('StreamControlService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StreamControlService]
    });
  });

  it('should be created', inject([StreamControlService], (service: StreamControlService) => {
    expect(service).toBeTruthy();
  }));
});
