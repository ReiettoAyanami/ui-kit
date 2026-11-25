import { TestBed } from '@angular/core/testing';

import { LenziGlassSwitch } from './glass-switch';

describe('LenziGlassSwitch', () => {
  function make(checked = false) {
    const fixture = TestBed.createComponent(LenziGlassSwitch);
    fixture.componentRef.setInput('label', 'Notifications');
    fixture.componentRef.setInput('checked', checked);
    fixture.detectChanges();
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.track')!;
    const press = (type: string, x = 0) => track.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX: x }));
    return { fixture, track, press };
  }

  it('is a switch with its name and state', () => {
    const { track } = make(true);
    expect(track.getAttribute('role')).toBe('switch');
    expect(track.getAttribute('aria-label')).toBe('Notifications');
    expect(track.getAttribute('aria-checked')).toBe('true');
    expect(track.classList.contains('on')).toBe(true);
  });

  it('a tap switches it; held, the thumb is glass', () => {
    const { fixture, track, press } = make();
    press('pointerdown');
    fixture.detectChanges();
    expect(track.classList.contains('active')).toBe(true);
    press('pointerup');
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(track.getAttribute('aria-checked')).toBe('true');
  });

  it('a drag puts it where it is let go', () => {
    const { fixture, press } = make(true);
    press('pointerdown', 100);
    press('pointermove', 60);
    press('pointerup', 60);
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('Space switches it; disabled, nothing does', () => {
    const { fixture, track } = make();
    track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(fixture.componentInstance.checked()).toBe(true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(fixture.componentInstance.checked()).toBe(true);
  });
});
