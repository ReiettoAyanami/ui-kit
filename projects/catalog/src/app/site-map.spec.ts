import { routes } from './app.routes';
import { DOCS } from './registry';
import { SITE, sitePages } from './site-map';

describe('the pages of the catalog', () => {
  const pages = sitePages(DOCS);
  const keys = pages.map((page) => page.key);

  it('are the fixed ones and one per piece of the registry, each once', () => {
    expect(keys).toEqual(expect.arrayContaining(['', 'components', 'rules', 'ai-rules', 'variables', 'libraries', 'history', 'admin']));
    for (const doc of DOCS) expect(keys).toContain(`components/${doc.id}`);
    expect(pages).toHaveLength(SITE.length + DOCS.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(pages.find((page) => page.key === 'rules')).toEqual({ key: 'rules', title: 'Rules', always: false, resources: ['kit-src/RULES.md'] });
  });

  it('the catalog itself is always public: the overview, the components, each piece; so is the Admin page', () => {
    const toggled = pages.filter((page) => !page.always).map((page) => page.key);
    expect(toggled.sort()).toEqual(['ai-rules', 'history', 'libraries', 'rules', 'variables']);
    const addButton = pages.find((page) => page.key === 'components/add-button')!;
    expect(addButton.always).toBe(true);
    expect(addButton.resources).toContain('kit-src/src/lib/add-button/README.md');
  });

  it('every fixed page is a route with its title, and every route but the not-found page asks who is looking', () => {
    for (const entry of SITE) {
      const route = routes.find((candidate) => candidate.path === entry.path);
      expect(route?.title, entry.path).toBe(entry.title);
      expect(route?.loadComponent, entry.path).toBeTypeOf('function');
    }
    for (const route of routes) expect(!!route.canMatch?.length, String(route.path ?? 'frame')).toBe(route.path !== '**');
  });
});
