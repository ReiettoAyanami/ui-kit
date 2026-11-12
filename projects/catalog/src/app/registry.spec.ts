import { CATEGORIES, DOCS, defaults, docById } from './registry';

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
