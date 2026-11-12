import { ActivatedRouteSnapshot, Routes, UrlSegment } from '@angular/router';

import { LenziNotFound } from '@lenzi/ui-kit';

import { docById } from './registry';

/** `/frame/<id>` and everything under it (a demo's own links, like the navigation list's): one demo frame. */
function frameMatcher(segments: UrlSegment[]) {
  return segments[0]?.path === 'frame' && segments.length >= 2 ? { consumed: segments, posParams: { id: segments[1]! } } : null;
}

export const routes: Routes = [
  { path: '', title: 'ui-kit', loadComponent: () => import('./pages/overview-page/overview-page').then((m) => m.OverviewPage) },
  { path: 'components', title: 'Components', loadComponent: () => import('./pages/components-page/components-page').then((m) => m.ComponentsPage) },
  {
    path: 'components/:id',
    title: (route: ActivatedRouteSnapshot) => docById(route.paramMap.get('id') ?? '')?.name ?? 'Not found',
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
  { path: 'libraries', title: 'Libraries', loadComponent: () => import('./pages/libraries-page/libraries-page').then((m) => m.LibrariesPage) },
  // A demo alone, for the frame of its component page: the page without the shell around it.
  { matcher: frameMatcher, data: { bare: true }, loadComponent: () => import('./pages/frame-page/frame-page').then((m) => m.FramePage) },
  { path: '**', title: 'Not found', component: LenziNotFound, data: { linkLabel: 'Go to the overview', link: '/' } },
];
