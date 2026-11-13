import { ActivatedRouteSnapshot, Route, Routes, UrlSegment } from '@angular/router';

import { LenziNotFound } from '@lenzi/ui-kit';

import { DOCS, docById } from './registry';
import { publicPage } from './shared/public-pages';
import { SitePage, SitePageData } from './shared/site-pages';

/** `/frame/<id>` and everything under it (a demo's own links, like the navigation list's): one demo frame. */
function frameMatcher(segments: UrlSegment[]) {
  return segments[0]?.path === 'frame' && segments.length >= 2 ? { consumed: segments, posParams: { id: segments[1]! } } : null;
}

/** One page per piece of the registry: what the component route makes (the Admin page lists them). */
function componentPages(): SitePage[] {
  return DOCS.map((doc) => ({
    key: `components/${doc.id}`,
    title: doc.name,
    group: doc.category,
    resources: [...doc.files, doc.readme, doc.ai].map((file) => `kit-src/${file}`),
  }));
}

const pages: Routes = [
  { path: '', title: 'ui-kit', loadComponent: () => import('./pages/overview-page/overview-page').then((m) => m.OverviewPage) },
  { path: 'components', title: 'Components', loadComponent: () => import('./pages/components-page/components-page').then((m) => m.ComponentsPage) },
  {
    path: 'components/:id',
    title: (route: ActivatedRouteSnapshot) => docById(route.paramMap.get('id') ?? '')?.name ?? 'Not found',
    data: { pages: componentPages } satisfies SitePageData,
    loadComponent: () => import('./pages/component-page/component-page').then((m) => m.ComponentPage),
  },
  {
    path: 'rules',
    title: 'Rules',
    data: { file: 'RULES.md', kind: 'rules' },
    loadComponent: () => import('./pages/markdown-page/markdown-page').then((m) => m.MarkdownPage),
  },
  {
    path: 'ai-rules',
    title: 'AI rules',
    data: { file: 'AI-RULES.md', kind: 'ai' },
    loadComponent: () => import('./pages/markdown-page/markdown-page').then((m) => m.MarkdownPage),
  },
  { path: 'variables', title: 'Variables', loadComponent: () => import('./pages/variables-page/variables-page').then((m) => m.VariablesPage) },
  { path: 'libraries', title: 'Libraries', data: { resources: ['kit-src/libraries.json'] } satisfies SitePageData, loadComponent: () => import('./pages/libraries-page/libraries-page').then((m) => m.LibrariesPage) },
  { path: 'history', title: 'History', data: { resources: ['api/history'] } satisfies SitePageData, loadComponent: () => import('./pages/history-page/history-page').then((m) => m.HistoryPage) },
  // Where the admin signs in: always there, and not a page to show or hide.
  { path: 'admin', title: 'Admin', data: { always: true } satisfies SitePageData, loadComponent: () => import('./pages/admin-page/admin-page').then((m) => m.AdminPage) },
  // A demo alone, for the frame of its component page: the page without the shell around it.
  {
    matcher: frameMatcher,
    // a frame is seen by whoever sees its component's page
    data: { bare: true, pageKey: (segments: string[]) => `components/${segments[1]}` },
    loadComponent: () => import('./pages/frame-page/frame-page').then((m) => m.FramePage),
  },
  { path: '**', title: 'Not found', component: LenziNotFound, data: { linkLabel: 'Go to the overview', link: '/' } },
];

/** Every page asks whether whoever is looking may see it (the admin's choice): all but the Admin page and the not-found page. */
const guarded = (route: Route): Route => (route.path === '**' || route.path === 'admin' ? route : { ...route, canMatch: [publicPage] });

export const routes: Routes = pages.map(guarded);
