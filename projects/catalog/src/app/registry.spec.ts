import { CATEGORIES, DOCS, Value, Values, codedControls, defaults, docById, readUsage } from './registry';

describe('the registry of the catalog', () => {
  it('has one page per id, in a known category', () => {
    const ids = DOCS.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const doc of DOCS) expect(CATEGORIES).toContain(doc.category);
    expect(docById('add-button')?.name).toBe('Add button');
    expect(docById('nothing')).toBeUndefined();
  });

  it('every page has its rules, its AI notes and its code', () => {
    for (const doc of DOCS) {
      expect(doc.readme, doc.id).toMatch(/README\.md$/);
      expect(doc.ai, doc.id).toMatch(/AI\.md$/);
      expect(doc.files.length, doc.id).toBeGreaterThan(0);
    }
  });

  it('every parameter starts inside its own range and choices', () => {
    for (const doc of DOCS) {
      for (const control of doc.controls) {
        const value = control.default;
        if (control.type === 'number') {
          expect(typeof value, `${doc.id}.${control.key}`).toBe('number');
          if (control.min !== undefined) expect(value as number).toBeGreaterThanOrEqual(control.min);
          if (control.max !== undefined) expect(value as number).toBeLessThanOrEqual(control.max);
        }
        if (control.type === 'select') expect(control.options?.map((o) => o.value), `${doc.id}.${control.key}`).toContain(value);
        if (control.type === 'boolean') expect(typeof value).toBe('boolean');
      }
    }
  });

  it('every usage example renders with the defaults', () => {
    for (const doc of DOCS) {
      const usage = doc.usage(defaults(doc));
      expect(usage.length, doc.id).toBeGreaterThan(10);
      expect(usage, doc.id).not.toContain('undefined');
    }
  });
});

describe('the usage code moves the parameters back', () => {
  /** Every parameter the code carries, one at a time changed from its default to another value. */
  function variants(doc: (typeof DOCS)[number]): Values[] {
    const base = defaults(doc);
    return codedControls(doc).flatMap((control) => {
      const other: Value =
        control.type === 'boolean'
          ? !control.default
          : control.type === 'number'
            ? control.default === (control.max ?? 0)
              ? (control.min ?? 0)
              : (control.max ?? Number(control.default) + 1)
            : control.type === 'select'
              ? (control.options?.find((option) => option.value !== control.default)?.value ?? control.default)
              : control.key === 'options'
                ? 'day,week,month'
                : `${String(control.default)} changed`;
      return [{ ...base, [control.key]: other }];
    });
  }

  it('reads back, from each page’s code, the values that wrote it', () => {
    for (const doc of DOCS) {
      for (const values of [defaults(doc), ...variants(doc)]) {
        const { values: read, notes } = readUsage(doc, doc.usage(values));
        const expected = Object.fromEntries(codedControls(doc).map((control) => [control.key, values[control.key]]));
        expect(read, `${doc.id}: ${JSON.stringify(values)}`).toEqual(expected);
        expect(notes, doc.id).toEqual([]);
      }
    }
  });

  it('a value out of range is brought into it, a choice that does not exist is left out, both said', () => {
    const delta = docById('delta')!;
    const { values, notes } = readUsage(delta, `<lenzi-delta [ratio]="'7'" good="sideways" />`);
    expect(values['ratio']).toBe(1);
    expect(values['good']).toBeUndefined();
    expect(notes).toEqual(['Ratio (the API’s): 7 is out of its range, 1 used', 'Good when it goes: "sideways" is not one of up, down, none']);
  });
});
