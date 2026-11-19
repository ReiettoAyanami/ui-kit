import { TestBed } from '@angular/core/testing';

import { LenziSights } from './sights';

describe('LenziSights', () => {
  let sights: LenziSights;

  beforeEach(() => {
    sights = TestBed.inject(LenziSights);
  });

  it('has nothing to look at until a source comes, and nothing again once it goes', () => {
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
    const leave = sights.add({}, () => ({ x: 10, y: 10 }));
    expect(sights.nearest({ x: 0, y: 0 })).toEqual({ x: 10, y: 10 });
    leave();
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
  });

  it('gives the nearest sight of every source', () => {
    sights.add({}, () => ({ x: 300, y: 0 }));
    sights.add({}, () => ({ x: 50, y: 0 }));
    sights.add({}, () => null);
    expect(sights.nearest({ x: 0, y: 0 })).toEqual({ x: 50, y: 0 });
  });

  it('says the middle of the sights round a point and how many, of every source; none with none there', () => {
    const sights = new LenziSights();
    sights.add({}, () => null, () => ({ x: 100, y: 100, count: 3 }));
    sights.add({}, () => null, () => ({ x: 200, y: 100, count: 1 }));
    sights.add({}, () => null);
    expect(sights.around({ x: 0, y: 0 }, 500)).toEqual({ x: 125, y: 100, count: 4 });
    const empty = new LenziSights();
    empty.add({}, () => null, () => null);
    expect(empty.around({ x: 0, y: 0 }, 500)).toBeNull();
  });
});
