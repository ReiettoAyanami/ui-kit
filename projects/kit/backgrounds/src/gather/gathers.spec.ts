import { LenziGathers } from './gathers';

function zone(left: number, top: number, width: number, height: number): Element {
  return { getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height, width, height }) } as unknown as Element;
}

describe('LenziGathers', () => {
  it('gives the zone the window shows most of, its whole box', () => {
    const gathers = new LenziGathers();
    gathers.add(zone(100, -500, 800, 600)); // 100 px of it on the screen
    const shown = zone(100, 300, 800, 400); // all of it
    gathers.add(shown);
    gathers.add(zone(100, 850, 800, 400)); // 50 px of it
    expect(gathers.area(1000, 900)).toEqual({ left: 100, top: 300, right: 900, bottom: 700 });
  });

  it('gives none when no zone is on the screen, or when it was taken away', () => {
    const gathers = new LenziGathers();
    const leave = gathers.add(zone(0, 2000, 800, 400));
    expect(gathers.area(1000, 900)).toBeNull();
    leave();
    expect(gathers.area(1000, 3000)).toBeNull();
  });
});
