import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { LenziFigure, LenziFigureGrid } from '@lenzi/ui-kit';

import { Markdown } from '../../shared/markdown/markdown';
import { CATEGORIES, DOCS } from '../../registry';

/** The first page: what the kit is, how an app takes it, and where everything is. */
@Component({
  selector: 'app-overview-page',
  imports: [LenziFigure, LenziFigureGrid, Markdown, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.css',
})
export class OverviewPage {
  protected readonly components = DOCS.length;
  protected readonly categories = CATEGORIES.length;

  protected readonly sections = [
    { link: '/components', icon: 'widgets', title: 'Components', text: 'Every piece of the kit: a live demo, its parameters, its rules, its AI notes and its code.' },
    { link: '/rules', icon: 'rule', title: 'Rules', text: 'The look and the behaviour every app follows: Material 3, heavily modified.' },
    { link: '/ai-rules', icon: 'smart_toy', title: 'AI rules', text: 'How Claude works with the kit: read first, compose, never restyle, add to the kit first.' },
    { link: '/variables', icon: 'tune', title: 'Variables', text: 'The global variables of the look: change them live, save them into the kit.' },
    { link: '/libraries', icon: 'inventory_2', title: 'Libraries', text: 'Every frontend library the apps use, its version and its rules.' },
  ];

  protected readonly start = `// 1. install it (the tarball of a release, or the folder while developing)
npm install @lenzi/ui-kit

// 2. angular.json, "styles": the kit's look before the app's own
"node_modules/@lenzi/ui-kit/styles/kit.scss",
"node_modules/@lenzi/ui-kit/styles/fonts.css",

// 3. app.config.ts
providers: [provideLenziKit({ appId: 'my-app' }), provideHttpClient(withInterceptors([lenziErrorInterceptor]))]

// 4. app.html
<lenzi-app-shell>
  <lenzi-nav-list lenziShellNav appName="My app" [pages]="pages" />
  <router-outlet />
</lenzi-app-shell>`;

  protected readonly startMarkdown = '```typescript\n' + this.start + '\n```';
}
