import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlowDemo } from './glow-demo';

describe('GlowDemo', () => {
  let component: GlowDemo;
  let fixture: ComponentFixture<GlowDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlowDemo],
    }).compileComponents();

    fixture = TestBed.createComponent(GlowDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
