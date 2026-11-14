import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziAppShell } from './app-shell';
import { LenziShellSearch } from './shell-search';

@Component({
  imports: [LenziShellSearch],
  template: `<div lenziShellSearch>search</div>`,
})
class Host {}

/** A shell whose bar is where the test says: 8 px from the left, 64 high, its right end moving. */
function fakeShell() {
  const told: ({ left: number; right: number } | null)[] = [];
  let right = 1912;
  return {
    told,
    moveEdge: (to: number) => (right = to),
    shell: {
      compact: signal(false),
      searchAt: (edges: { left: number; right: number } | null) => told.push(edges),
      barBox: () => ({ left: 8, right, height: 64, top: 8, bottom: 72, width: right - 8 }) as DOMRect,
    },
  };
}

async function searchBar(fake: ReturnType<typeof fakeShell>) {
  TestBed.configureTestingModule({ providers: [{ provide: LenziAppShell, useValue: fake.shell }] });
  const fixture = TestBed.createComponent(Host);
  const element = fixture.nativeElement.querySelector('[lenziShellSearch]') as HTMLElement;
  // where the page lays it out: 456 to 1016 (a wide window, the page's column in the middle), 48 high
  element.getBoundingClientRect = () => {
    const moved = parseFloat(element.style.translate) || 0;
    return { left: 456 + moved, right: 1016 + moved, top: 16, bottom: 64, width: 560, height: 48 } as DOMRect;
  };
  Object.defineProperty(element, 'offsetHeight', { value: 48 });
  fixture.detectChanges();
  await fixture.whenStable();
  const settle = () => {
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
  };
  return { element, settle };
}

describe('LenziShellSearch', () => {
  it('tells the shell where the page lays it out', async () => {
    const fake = fakeShell();
    const { element } = await searchBar(fake);
    expect(element.classList).toContain('lenzi-shell-search');
    expect(fake.told.at(-1)).toEqual({ left: 456, right: 1016 });
  });

  it('waits for the closing edge, rides on it, and stops just after the button', async () => {
    const fake = fakeShell();
    const { element, settle } = await searchBar(fake);
    const moved = () => parseFloat(element.style.translate) || 0;

    // the edge still to its right (its gap is 8: (64 - 48) / 2): where the page put it, under the bar
    fake.moveEdge(1300);
    settle();
    expect(moved()).toBe(0);
    expect(element.classList).not.toContain('lenzi-shell-search-in-bar');

    // the edge has reached it and gone on: on the edge, over the bar
    fake.moveEdge(824);
    settle();
    expect(moved()).toBe(-200);
    expect(element.classList).toContain('lenzi-shell-search-in-bar');

    // the bar closed: just after the button (8 + 64), never further
    fake.moveEdge(640);
    settle();
    expect(moved()).toBe(72 - 456);
    fake.moveEdge(200);
    settle();
    expect(moved()).toBe(72 - 456);

    // opening, it rides back out on the edge and stays where the page put it
    fake.moveEdge(1912);
    settle();
    expect(moved()).toBe(0);
    expect(element.classList).not.toContain('lenzi-shell-search-in-bar');
  });
});
