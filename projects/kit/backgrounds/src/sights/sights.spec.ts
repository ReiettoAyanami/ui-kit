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
});
