import { TestBed } from '@angular/core/testing';

import { KitAddButton } from './add-button';

describe('KitAddButton', () => {
  it('is a "+" with the label for screen readers, and says when it is pressed', () => {
    const fixture = TestBed.createComponent(KitAddButton);
    fixture.componentRef.setInput('label', 'Add substance');
    let presses = 0;
    fixture.componentInstance.pressed.subscribe(() => presses++);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Add substance');
    expect(button.textContent?.trim()).toBe('add');
    button.click();
    expect(presses).toBe(1);
  });

  it('sits where its host puts it when inline', () => {
    const fixture = TestBed.createComponent(KitAddButton);
    fixture.componentRef.setInput('label', 'Add');
    fixture.componentRef.setInput('placement', 'inline');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('inline')).toBe(true);
  });
});
