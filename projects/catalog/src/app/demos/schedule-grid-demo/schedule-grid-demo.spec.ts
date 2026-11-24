import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleGridDemo } from './schedule-grid-demo';

describe('ScheduleGridDemo', () => {
  let component: ScheduleGridDemo;
  let fixture: ComponentFixture<ScheduleGridDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleGridDemo],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleGridDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
