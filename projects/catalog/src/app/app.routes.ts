import { ActivatedRouteSnapshot, Route, Routes, UrlSegment } from '@angular/router';

import { LenziNotFound } from '@lenzi/ui-kit';

import { docById } from './registry';
import { publicPage } from './shared/public-pages';
import { SITE, SiteEntry, SitePath, componentKey } from './site-map';

/** `/frame/<id>` and everything under it (a demo's own links, like the navigation list's): one demo frame. */
function frameMatcher(segments: UrlSegment[]) {
  return segments[0]?.path === 'frame' && segments.length >= 2 ? { consumed: segments, posParams: { id: segments[1]! } } : null;
}

const markdownPage = () => import('./pages/markdown-page/markdown-page').then((m) => m.MarkdownPage);

/**
 * The component of every fixed page of the site map (site-map.ts says which pages exist, their titles
 * and what they read): a page there without its component here does not compile. Every page is lazy.
 */
const PAGES: Record<SitePath, Pick<Route, 'loadComponent' | 'data'>> = {
  '': { loadComponent: () => import('./pages/overview-page/overview-page').then((m) => m.OverviewPage) },
  components: { loadComponent: () => import('./pages/components-page/components-page').then((m) => m.ComponentsPage) },
  scenes: { loadComponent: () => import('./pages/scenes-page/scenes-page').then((m) => m.ScenesPage) },
  'scenes/maker': { loadComponent: () => import('./pages/scene-maker-page/scene-maker-page').then((m) => m.SceneMakerPage) },
  // a scene alone, from its link: no bar, no drawer (a tab, an iframe)
  scene: { loadComponent: () => import('./pages/scene-view-page/scene-view-page').then((m) => m.SceneViewPage), data: { bare: true } },
  rules: { loadComponent: markdownPage, data: { kind: 'rules' } },
  'ai-rules': { loadComponent: markdownPage, data: { kind: 'ai' } },
  variables: { loadComponent: () => import('./pages/variables-page/variables-page').then((m) => m.VariablesPage) },
  libraries: { loadComponent: () => import('./pages/libraries-page/libraries-page').then((m) => m.LibrariesPage) },
  history: { loadComponent: () => import('./pages/history-page/history-page').then((m) => m.HistoryPage) },
  admin: { loadComponent: () => import('./pages/admin-page/admin-page').then((m) => m.AdminPage) },
};

/** A route the public may not see does not match (the admin's choice): its address ends at the not-found page. */
const guarded = (route: Route): Route => ({ ...route, canMatch: [publicPage] });

const fixed: Routes = (SITE as readonly SiteEntry[]).map((entry) =>
  guarded({
    path: entry.path,
    title: entry.title,
    ...PAGES[entry.path as SitePath],
    // the Markdown pages read their document from here (a component's input)
    data: { ...PAGES[entry.path as SitePath].data, ...(entry.file ? { file: entry.file } : {}) },
  }),
);

export const routes: Routes = [
  ...fixed,
  // One page per piece of the registry (site-map.ts lists them from it).
  guarded({
    path: 'components/:id',
    title: (route: ActivatedRouteSnapshot) => docById(route.paramMap.get('id') ?? '')?.name ?? 'Not found',
    loadComponent: () => import('./pages/component-page/component-page').then((m) => m.ComponentPage),
  }),
  // A demo alone, for the frame of its component page: the page without the shell around it. It is
  // seen by whoever sees its component's page.
  guarded({
    matcher: frameMatcher,
    data: { bare: true, pageKey: (segments: string[]) => componentKey(segments[1] ?? '') },
    loadComponent: () => import('./pages/frame-page/frame-page').then((m) => m.FramePage),
  }),
  { path: '**', title: 'Not found', component: LenziNotFound, data: { linkLabel: 'Go to the overview', link: '/' } },
];
