import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziBento } from './bento';
import { LenziBentoTile } from './bento-tile';

@Component({
  imports: [LenziBento, LenziBentoTile],
  template: `
    <lenzi-bento>
      <lenzi-bento-tile [span]="7" [rows]="2">Title</lenzi-bento-tile>
      <lenzi-bento-tile [span]="5">Scenes</lenzi-bento-tile>
      <a lenziBentoTile href="/components" [span]="13">Components</a>
      <lenzi-bento-tile flat>A picture</lenzi-bento-tile>
    </lenzi-bento>
  `,
})
class Host {}

describe('LenziBento', () => {
  it('lays its tiles in its grid: each says its columns (on a medium width a wide one the whole row, the others half) and its rows', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const grid = element.querySelector('lenzi-bento > .grid')!;
    const tiles = [...grid.children] as HTMLElement[];
    expect(tiles.length).toBe(4);
    const [title, scenes, link, flat] = tiles;
    expect(title!.style.getPropertyValue('--lenzi-tile-span')).toBe('7');
    expect(title!.style.getPropertyValue('--lenzi-tile-span-medium')).toBe('6');
    expect(title!.style.getPropertyValue('--lenzi-tile-rows')).toBe('2');
    expect(scenes!.style.getPropertyValue('--lenzi-tile-span-medium')).toBe('3');
    expect(scenes!.style.getPropertyValue('--lenzi-tile-rows')).toBe('1');
    // never more than the twelve columns; on an <a> the whole tile is the link
    expect(link!.tagName).toBe('A');
    expect(link!.style.getPropertyValue('--lenzi-tile-span')).toBe('12');
    expect(link!.style.getPropertyValue('--lenzi-tile-span-medium')).toBe('6');
    // every tile is a panel of the page (an app of Liquid Glass makes it glass); a flat one has none of its own
    expect(tiles.every((tile) => tile.classList.contains('lenzi-surface'))).toBe(true);
    expect(flat!.classList.contains('lenzi-bento-tile-flat')).toBe(true);
    expect(title!.classList.contains('lenzi-bento-tile-flat')).toBe(false);
  });
});
