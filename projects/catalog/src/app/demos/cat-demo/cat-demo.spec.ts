import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatDemo } from './cat-demo';

describe('CatDemo', () => {
  let fixture: ComponentFixture<CatDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatDemo],
    }).compileComponents();

    fixture = TestBed.createComponent(CatDemo);
    await fixture.whenStable();
  });

  it('shows one cat of each kind, each with its material', () => {
    const cats = (fixture.nativeElement as HTMLElement).querySelectorAll('lenzi-cat');
    expect(cats).toHaveLength(5);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('mat-button-toggle-group')).toHaveLength(5);
  });
});
