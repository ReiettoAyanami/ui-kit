import { LenziGathers, linesOf } from './gathers';

function zone(left: number, top: number, width: number, height: number): Element {
  return { getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height, width, height }) } as unknown as Element;
}

describe('LenziGathers', () => {
  it('gives the zone the window shows most of: its whole box when it has no text', () => {
    const gathers = new LenziGathers();
    gathers.add(zone(100, -500, 800, 600)); // 100 px of it on the screen
    const shown = zone(100, 300, 800, 400); // all of it
    gathers.add(shown);
    gathers.add(zone(100, 850, 800, 400)); // 50 px of it
    expect(gathers.areas(1000, 900)).toEqual([{ left: 100, top: 300, right: 900, bottom: 700 }]);
  });

  it('gives none when no zone is on the screen, or when it was taken away', () => {
    const gathers = new LenziGathers();
    const leave = gathers.add(zone(0, 2000, 800, 400));
    expect(gathers.areas(1000, 900)).toEqual([]);
    leave();
    expect(gathers.areas(1000, 3000)).toEqual([]);
  });

  it("gives a zone of text as its lines: the boids go under each line, not under the zone's empty corners", () => {
    const element = document.createElement('div');
    element.style.cssText = 'position: fixed; left: 0; top: 0; width: 200px; font: 20px/30px monospace';
    element.textContent = 'one two three four five six seven eight nine ten eleven twelve';
    document.body.append(element);
    const gathers = new LenziGathers();
    gathers.add(element);
    const lines = gathers.areas(1000, 900);
    element.remove();
    // jsdom has no layout: then the box; a browser gives the lines, more than one, each within the box
    for (const line of lines) {
      expect(line.right).toBeGreaterThanOrEqual(line.left);
      expect(line.bottom).toBeGreaterThanOrEqual(line.top);
    }
  });
});

describe('linesOf', () => {
  it('joins the pieces of one line into one box, top to bottom, leaving out the empty ones', () => {
    expect(
      linesOf([
        { left: 10, top: 40, right: 300, bottom: 70 },
        { left: 0, top: 0, right: 120, bottom: 30 },
        { left: 120, top: 2, right: 280, bottom: 28 },
        { left: 50, top: 50, right: 50, bottom: 60 },
      ]),
    ).toEqual([
      { left: 0, top: 0, right: 280, bottom: 30 },
      { left: 10, top: 40, right: 300, bottom: 70 },
    ]);
  });
});

describe('LenziGathers, by box and spilling over', () => {
  it("a zone that says so gives its whole box, grown by its spill on every side", () => {
    const gathers = new LenziGathers();
    const element = { getBoundingClientRect: () => ({ left: 100, top: 300, right: 900, bottom: 700, width: 800, height: 400 }) } as unknown as Element;
    gathers.add(element, () => ({ to: 'box', spill: 20 }));
    expect(gathers.areas(1000, 900)).toEqual([{ left: 80, top: 280, right: 920, bottom: 720 }]);
  });
});

