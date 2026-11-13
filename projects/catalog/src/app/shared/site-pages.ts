// The pages of the catalog, read from its own routes (lenzi, 2026-11-13: "Don't list them manually,
// use a code solution to know which pages are there / can be generated"): a route with a fixed
// address and a title is a page; a route with a parameter says which pages it makes (its data's
// `pages`: the component route makes one per entry of the registry). A new route, or a new piece in
// the registry, is in the Admin page's list by itself. A plain module (no schematic makes one).
import { Route } from '@angular/router';

/** One page the admin can show to the public or keep for itself. */
export interface SitePage {
  /** Its address without the first "/": "", "rules", "components/add-button". */
  key: string;
  title: string;
  /** Where the Admin page lists it: "Pages", or a category of the registry. */
  group: string;
  /** What it reads from the server ("kit-src/RULES.md", "api/history"): refused to the public with it. */
  resources: string[];
}

/** What a route may say about itself in its `data`. */
export interface SitePageData {
  /** Never hidden, and not in the list (the Admin page: it is where the admin signs in). */
  always?: boolean;
  /** The pages a route with a parameter makes. */
  pages?: () => SitePage[];
  /** What a fixed page reads from the server, besides `file`. */
  resources?: string[];
  /** A document of the kit the page shows (the Markdown pages). */
  file?: string;
  /** The page an address under this route belongs to (a demo's frame belongs to its component's page). */
  pageKey?: (segments: string[]) => string;
}

export const PAGES_GROUP = 'Pages';

export function sitePages(routes: readonly Route[]): SitePage[] {
  const pages: SitePage[] = [];
  for (const route of routes) {
    const data = (route.data ?? {}) as SitePageData;
    if (data.always) continue;
    if (data.pages) {
      pages.push(...data.pages());
    } else if (route.path !== undefined && route.path !== '**' && !route.path.includes(':') && typeof route.title === 'string') {
      pages.push({
        key: route.path,
        title: route.title,
        group: PAGES_GROUP,
        resources: [...(data.file ? [`kit-src/${data.file}`] : []), ...(data.resources ?? [])],
      });
    }
  }
  return pages;
}

/** What the server must refuse to the public: what the hidden pages read and no shown page does. */
export function hiddenResources(pages: readonly SitePage[], hidden: ReadonlySet<string>): string[] {
  const shown = new Set(pages.filter((page) => !hidden.has(page.key)).flatMap((page) => page.resources));
  return [...new Set(pages.filter((page) => hidden.has(page.key)).flatMap((page) => page.resources))].filter((resource) => !shown.has(resource));
}
