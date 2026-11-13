import { routes } from '../app.routes';
import { DOCS } from '../registry';
import { PAGES_GROUP, hiddenResources, sitePages } from './site-pages';

describe('the pages of the catalog, from its routes', () => {
  const pages = sitePages(routes);
  const keys = pages.map((page) => page.key);

  it('finds every fixed page and one per piece of the registry, each once', () => {
    expect(keys).toEqual(expect.arrayContaining(['', 'components', 'rules', 'ai-rules', 'variables', 'libraries', 'history']));
    for (const doc of DOCS) expect(keys).toContain(`components/${doc.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(pages.find((page) => page.key === 'components/add-button')).toMatchObject({ title: 'Add button', group: 'Actions and inputs' });
    expect(pages.find((page) => page.key === 'rules')).toMatchObject({ title: 'Rules', group: PAGES_GROUP, resources: ['kit-src/RULES.md'] });
  });

  it('leaves out the Admin page, the frames and the not-found page', () => {
    expect(keys).not.toContain('admin');
    expect(keys).not.toContain('**');
    expect(keys.some((key) => key.startsWith('frame'))).toBe(false);
  });

  it('every route but the Admin page and the not-found page asks whether the public may see it', () => {
    for (const route of routes) {
      const open = route.path === '**' || route.path === 'admin';
      expect(!!route.canMatch?.length, String(route.path ?? 'frame')).toBe(!open);
    }
  });

  it('refuses what the hidden pages read, unless a shown page reads it too', () => {
    const some = [
      { key: 'a', title: 'A', group: 'x', resources: ['kit-src/a.ts', 'kit-src/shared.css'] },
      { key: 'b', title: 'B', group: 'x', resources: ['kit-src/b.ts', 'kit-src/shared.css'] },
    ];
    expect(hiddenResources(some, new Set(['a']))).toEqual(['kit-src/a.ts']);
    expect(hiddenResources(some, new Set(['a', 'b'])).sort()).toEqual(['kit-src/a.ts', 'kit-src/b.ts', 'kit-src/shared.css']);
    expect(hiddenResources(some, new Set())).toEqual([]);
  });
});
