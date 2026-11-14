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

  it('shows one cat, and a bulb to light it', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('lenzi-cat')).toHaveLength(1);
    expect(page.querySelector('button[mat-fab]')?.classList).toContain('lenzi-glow-on');
  });

  it('draws the expression and the back the parameters choose', async () => {
    fixture.componentRef.setInput('values', { expression: 'none', back: 'hard-hat', material: 'glass' });
    await fixture.whenStable();
    const cat = (fixture.nativeElement as HTMLElement).querySelector('lenzi-cat')!;
    expect(cat.querySelector('.eye')).toBeNull();
    expect(cat.querySelector('.shape')?.classList).toContain('lenzi-lit');
  });
});
