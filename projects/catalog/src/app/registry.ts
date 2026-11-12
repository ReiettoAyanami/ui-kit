// Every page of the catalog that documents a piece of the kit: what it is, where it comes from,
// which files show its code, its rules and AI notes, its demo and the parameters the GUI changes.
// A plain data module (no schematic makes one). Paths are relative to the kit's folder
// (projects/kit), which the catalog serves under `kit-src/` (angular.json, assets).
import { Type } from '@angular/core';

export type ControlType = 'text' | 'number' | 'boolean' | 'select' | 'color';

/** One parameter of a demo, as the GUI shows it. */
export interface Control {
  key: string;
  label: string;
  type: ControlType;
  default: string | number | boolean;
  options?: readonly { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export type Values = Record<string, string | number | boolean>;

export const CATEGORIES = [
  'Foundations',
  "Material, the kit's way",
  'Layout',
  'Actions and inputs',
  'Data',
  'Feedback',
  'Dialogs',
  'Services',
  '3D',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Entry = '@lenzi/ui-kit' | '@lenzi/ui-kit/charts' | '@lenzi/ui-kit/three' | '@lenzi/ui-kit/http' | 'styles';

export interface KitDoc {
  id: string;
  name: string;
  category: Category;
  /** One sentence: what it is for. */
  summary: string;
  /** How it is used: a selector, a class, a function. */
  api: string;
  entry: Entry;
  /** Where it was imported from. */
  origin: string;
  /** The files of its code, relative to projects/kit. */
  files: readonly string[];
  /** Its rules (README.md) and its notes for Claude (AI.md), relative to projects/kit. */
  readme: string;
  ai: string;
  demo: () => Promise<Type<unknown>>;
  controls: readonly Control[];
  /** The code that uses it with the values of the GUI. */
  usage: (values: Values) => string;
  usageLanguage: 'html' | 'typescript' | 'scss' | 'json';
  /** The demo frame's height, in px. */
  height: number;
}

const lib = (folder: string, ...names: string[]) => names.map((name) => `src/lib/${folder}/${name}`);
const component = (folder: string, name = folder) => lib(folder, `${name}.ts`, `${name}.html`, `${name}.css`, `${name}.spec.ts`);
const docs = (folder: string) => ({ readme: `${folder}/README.md`, ai: `${folder}/AI.md` });
const styleDocs = (id: string) => docs(`src/styles/docs/${id}`);
const attr = (name: string, value: string | number | boolean | null | undefined) =>
  value === '' || value === null || value === undefined || value === false ? '' : value === true ? ` ${name}` : ` ${name}="${value}"`;
const ICONS = ['payments', 'inventory_2', 'numbers', 'sell', 'schedule', 'insights'].map((value) => ({ value, label: value }));
const TONES = ['neutral', 'secondary', 'tertiary'].map((value) => ({ value, label: value }));

export const DOCS: readonly KitDoc[] = [
  // Foundations ----------------------------------------------------------------------------------
  {
    id: 'theme',
    name: 'Theme and typography',
    category: 'Foundations',
    summary: 'Material 3, dark only: violet accents on neutral greys, one font (Roboto Mono) with bold labels.',
    api: 'styles/kit.scss',
    entry: 'styles',
    origin: 'substance-tracker material-theme.scss (identical in vtiger-reader)',
    files: ['src/styles/_theme.scss', 'src/styles/kit.scss', 'src/styles/tokens.css', 'src/styles/fonts.css'],
    ...styleDocs('theme'),
    demo: () => import('./demos/theme-demo/theme-demo').then((m) => m.ThemeDemo),
    controls: [
      {
        key: 'show',
        label: 'Show',
        type: 'select',
        default: 'colours',
        options: [
          { value: 'colours', label: 'Colours' },
          { value: 'typography', label: 'Typography' },
        ],
      },
    ],
    usage: () => `// angular.json, "styles" (the kit's look, then the app's own):
"node_modules/@lenzi/ui-kit/styles/kit.scss",
"node_modules/@lenzi/ui-kit/styles/fonts.css",
"src/styles.css"`,
    usageLanguage: 'json',
    height: 620,
  },
  {
    id: 'glass-motion',
    name: 'Glass and motion',
    category: 'Foundations',
    summary: 'Windows, menus and bars are see-through and blurred; they rise into place and never grow.',
    api: 'styles/global.css',
    entry: 'styles',
    origin: 'substance-tracker styles.css ("glass", 2026-10-01 → 10-03)',
    files: ['src/styles/global.css', 'src/styles/tokens.json'],
    ...styleDocs('glass-motion'),
    demo: () => import('./demos/glass-motion-demo/glass-motion-demo').then((m) => m.GlassMotionDemo),
    controls: [
      { key: 'reduce', label: 'Reduce transparency', type: 'boolean', default: false },
      { key: 'glass', label: 'Window opacity (%)', type: 'number', default: 56, min: 0, max: 100, step: 1 },
      { key: 'blur', label: 'Glass blur (px)', type: 'number', default: 24, min: 0, max: 64, step: 1 },
    ],
    usage: () => `// A window: open it with LenziDialogs (its own history entry); the glass and the rise are global.
const saved = await this.dialogs.open(MyForm, { substance }, { panelClass: 'lenzi-dialog-raised' });`,
    usageLanguage: 'typescript',
    height: 480,
  },
  {
    id: 'borders-shape',
    name: 'Borders and shape',
    category: 'Foundations',
    summary: 'Every rounded border is 2 px, so corners are as thick as sides; surfaces above the page have one.',
    api: 'var(--lenzi-border)',
    entry: 'styles',
    origin: 'substance-tracker styles.css ("borders", 2026-10-02)',
    files: ['src/styles/global.css', 'src/styles/tokens.json'],
    ...styleDocs('borders-shape'),
    demo: () => import('./demos/borders-shape-demo/borders-shape-demo').then((m) => m.BordersShapeDemo),
    controls: [{ key: 'border', label: 'Border width (px)', type: 'number', default: 2, min: 1, max: 4, step: 1 }],
    usage: () => `.my-sub-card {
  border: var(--lenzi-border) solid var(--mat-sys-outline-variant);
  border-radius: var(--lenzi-panel-radius);
}`,
    usageLanguage: 'scss',
    height: 460,
  },
  // Material, the kit's way --------------------------------------------------------------------
  {
    id: 'toggle-group',
    name: 'Toggle groups',
    category: "Material, the kit's way",
    summary: "Material's button toggles as 32 px pills, whole words on every side.",
    api: '<mat-button-toggle-group>',
    entry: 'styles',
    origin: 'substance-tracker styles.css ("toggles", 2026-09-30)',
    files: ['src/styles/global.css'],
    ...styleDocs('toggle-group'),
    demo: () => import('./demos/toggle-group-demo/toggle-group-demo').then((m) => m.ToggleGroupDemo),
    controls: [
      { key: 'options', label: 'Choices (comma separated)', type: 'text', default: 'last,average' },
      { key: 'indicator', label: 'Check mark on the chosen one', type: 'boolean', default: false },
    ],
    usage: (v) => {
      const options = String(v['options']).split(',').map((o) => o.trim()).filter(Boolean);
      return `<mat-button-toggle-group${v['indicator'] ? '' : ' hideSingleSelectionIndicator'} aria-label="Price shown" [(value)]="shown">
${options.map((o) => `  <mat-button-toggle value="${o}">${o}</mat-button-toggle>`).join('\n')}
</mat-button-toggle-group>`;
    },
    usageLanguage: 'html',
    height: 260,
  },
  {
    id: 'menus-selects',
    name: 'Menus and selects',
    category: "Material, the kit's way",
    summary: 'Rounded glass panels a few px away from their field; the chosen option is a pill.',
    api: '<mat-select>, <mat-menu>',
    entry: 'styles',
    origin: 'substance-tracker styles.css (2026-10-02)',
    files: ['src/styles/global.css'],
    ...styleDocs('menus-selects'),
    demo: () => import('./demos/menus-selects-demo/menus-selects-demo').then((m) => m.MenusSelectsDemo),
    controls: [{ key: 'described', label: 'Options with a description', type: 'boolean', default: false }],
    usage: (v) =>
      v['described']
        ? `<mat-select panelClass="lenzi-described-options" [(value)]="metric">
  @for (option of metrics; track option.key) {
    <mat-option [value]="option.key">
      <span class="lenzi-option-label">{{ option.label }}</span>
      <span class="lenzi-option-description">{{ option.description }}</span>
    </mat-option>
  }
</mat-select>`
        : `<mat-form-field appearance="outline">
  <mat-label>Period</mat-label>
  <mat-select [(value)]="days">
    <mat-option [value]="30">Last 30 days</mat-option>
  </mat-select>
</mat-form-field>`,
    usageLanguage: 'html',
    height: 420,
  },
  {
    id: 'tooltips',
    name: 'Tooltips',
    category: "Material, the kit's way",
    summary: 'Dark glass with a border, not Material’s light box; two lines when needed.',
    api: '[matTooltip]',
    entry: 'styles',
    origin: 'substance-tracker styles.css (2026-10-02)',
    files: ['src/styles/global.css'],
    ...styleDocs('tooltips'),
    demo: () => import('./demos/tooltips-demo/tooltips-demo').then((m) => m.TooltipsDemo),
    controls: [
      { key: 'text', label: 'First line', type: 'text', default: 'Peroni 6-pack' },
      { key: 'second', label: 'Second line', type: 'text', default: '€1.20/bottiglia' },
    ],
    usage: (v) =>
      v['second']
        ? `<span [matTooltip]="'${v['text']}\\n${v['second']}'" matTooltipClass="lenzi-tooltip-lines">…</span>`
        : `<button mat-icon-button matTooltip="${v['text']}" aria-label="${v['text']}">…</button>`,
    usageLanguage: 'html',
    height: 300,
  },
  {
    id: 'expansion-panels',
    name: 'Expansion panels',
    category: "Material, the kit's way",
    summary: 'Panels with a border; flat inside a window; on a phone the header keeps only its title.',
    api: '<mat-expansion-panel>, .lenzi-flat',
    entry: 'styles',
    origin: 'substance-tracker styles.css (2026-10-01, 10-03)',
    files: ['src/styles/global.css'],
    ...styleDocs('expansion-panels'),
    demo: () => import('./demos/expansion-panels-demo/expansion-panels-demo').then((m) => m.ExpansionPanelsDemo),
    controls: [
      { key: 'flat', label: 'Flat', type: 'boolean', default: false },
      { key: 'description', label: 'Header description', type: 'text', default: 'Last 30 days' },
    ],
    usage: (v) => `<mat-expansion-panel${v['flat'] ? ' class="lenzi-flat"' : ''}>
  <mat-expansion-panel-header>
    <mat-panel-title>Metrics</mat-panel-title>
    <mat-panel-description>${v['description']}</mat-panel-description>
  </mat-expansion-panel-header>
  …
</mat-expansion-panel>`,
    usageLanguage: 'html',
    height: 380,
  },
  // Layout ---------------------------------------------------------------------------------------
  {
    id: 'app-shell',
    name: 'App shell',
    category: 'Layout',
    summary: 'The floating glass top bar, the navigation drawer on every screen, and the page.',
    api: '<lenzi-app-shell>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader app.html / app.css',
    files: component('app-shell'),
    ...docs('src/lib/app-shell'),
    demo: () => import('./demos/app-shell-demo/app-shell-demo').then((m) => m.AppShellDemo),
    controls: [
      { key: 'title', label: 'Title', type: 'text', default: 'Consumptions' },
      { key: 'actions', label: 'A bell in the top bar', type: 'boolean', default: true },
      { key: 'banner', label: 'A bar above it (Viewing as)', type: 'boolean', default: false },
      { key: 'below', label: 'A bar under it (Offline)', type: 'boolean', default: false },
      { key: 'bare', label: 'Bare (the page alone)', type: 'boolean', default: false },
    ],
    usage: (v) => `<lenzi-app-shell${attr('title', v['title'])}${v['bare'] ? ' [bare]="true"' : ''}>
  <lenzi-nav-list lenziShellNav appName="Substance tracker" [pages]="pages" [bottom]="bottom" />${
    v['actions'] ? '\n  <lenzi-notification-bell lenziShellActions noun="tickets" [items]="news()" />' : ''
  }${v['banner'] ? '\n  <lenzi-info-bar lenziShellBanner icon="visibility" tone="tertiary" actionLabel="Exit" (action)="exit()">Viewing as lenzi</lenzi-info-bar>' : ''}${
    v['below'] ? '\n  <lenzi-info-bar lenziShellBelow icon="cloud_off">Offline · data from 14:32</lenzi-info-bar>' : ''
  }
  <router-outlet />
</lenzi-app-shell>
<lenzi-version-label [version]="version()" />`,
    usageLanguage: 'html',
    height: 560,
  },
  {
    id: 'nav-list',
    name: 'Navigation list',
    category: 'Layout',
    summary: "The drawer's content: the app's name, one link per page, the rest at the bottom.",
    api: '<lenzi-nav-list>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader sidebar',
    files: component('nav-list'),
    ...docs('src/lib/nav-list'),
    demo: () => import('./demos/nav-list-demo/nav-list-demo').then((m) => m.NavListDemo),
    controls: [
      { key: 'appName', label: 'App name', type: 'text', default: 'Substance tracker' },
      { key: 'subtitle', label: 'Signed in as', type: 'text', default: 'lenzi' },
      { key: 'bottom', label: 'Entries at the bottom', type: 'boolean', default: true },
    ],
    usage: (v) => `<lenzi-nav-list lenziShellNav${attr('appName', v['appName'])}${attr('subtitle', v['subtitle'])} [pages]="pages"${
      v['bottom'] ? ' [bottom]="bottom" (pressed)="action($event)"' : ''
    } />

pages: LenziNavEntry[] = [
  { label: 'Consumptions', icon: 'history', link: '/' },
  { label: 'Substances', icon: 'inventory_2', link: '/substances' },
];
bottom: LenziNavEntry[] = [
  { label: 'Sign out', icon: 'logout', id: 'sign-out' },
  { label: 'Settings', icon: 'settings', link: '/settings' },
];`,
    usageLanguage: 'html',
    height: 520,
  },
  {
    id: 'not-found',
    name: 'Not found',
    category: 'Layout',
    summary: 'An address that does not exist: a card in the middle with one way out.',
    api: '<lenzi-not-found>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader not-found-page',
    files: component('not-found'),
    ...docs('src/lib/not-found'),
    demo: () => import('./demos/not-found-demo/not-found-demo').then((m) => m.NotFoundDemo),
    controls: [
      { key: 'title', label: 'Title', type: 'text', default: 'Page not found' },
      { key: 'text', label: 'Text', type: 'text', default: 'There is nothing at this address.' },
      { key: 'linkLabel', label: 'Way out', type: 'text', default: 'Go to the tickets' },
    ],
    usage: (v) => `// app.routes.ts: the last route
{ path: '**', title: 'Not found', component: NotFoundPage }

// not-found-page.html
<lenzi-not-found${attr('title', v['title'] === 'Page not found' ? '' : v['title'])}${attr('linkLabel', v['linkLabel'])} link="/" />`,
    usageLanguage: 'typescript',
    height: 420,
  },
  {
    id: 'version-label',
    name: 'Version label',
    category: 'Layout',
    summary: "The app's version, small and faint in the bottom right corner of every page.",
    api: '<lenzi-version-label>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader ui/version-label',
    files: component('version-label'),
    ...docs('src/lib/version-label'),
    demo: () => import('./demos/version-label-demo/version-label-demo').then((m) => m.VersionLabelDemo),
    controls: [{ key: 'version', label: 'Version', type: 'text', default: 'dev26.0.0.0002' }],
    usage: () => `<!-- app.html, after the shell -->
<lenzi-version-label [version]="version.value() ?? null" />

// app.ts: the API says which version runs
protected readonly version = rxResource({ stream: () => this.versionApi.getVersion() });`,
    usageLanguage: 'html',
    height: 240,
  },
  // Actions and inputs --------------------------------------------------------------------------
  {
    id: 'add-button',
    name: 'Add button',
    category: 'Actions and inputs',
    summary: 'The floating "+" at the bottom right; the page decides what it opens.',
    api: '<lenzi-add-button>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader ui/add-button',
    files: component('add-button'),
    ...docs('src/lib/add-button'),
    demo: () => import('./demos/add-button-demo/add-button-demo').then((m) => m.AddButtonDemo),
    controls: [{ key: 'label', label: 'What it does (screen readers)', type: 'text', default: 'Add substance' }],
    usage: (v) => `<lenzi-add-button${attr('label', v['label'])} (pressed)="add()" />`,
    usageLanguage: 'html',
    height: 300,
  },
  {
    id: 'pill-toggle',
    name: 'Pill toggle',
    category: 'Actions and inputs',
    summary: 'One pill that reads what the figure beside it shows, and switches it at a tap.',
    api: '<lenzi-pill-toggle>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/measure-toggle',
    files: component('pill-toggle'),
    ...docs('src/lib/pill-toggle'),
    demo: () => import('./demos/pill-toggle-demo/pill-toggle-demo').then((m) => m.PillToggleDemo),
    controls: [
      { key: 'first', label: 'First state', type: 'text', default: 'price' },
      { key: 'second', label: 'Second state', type: 'text', default: 'qty' },
    ],
    usage: (v) => `<lenzi-pill-toggle [options]="measures" [(value)]="measure" />
<span class="figure">{{ measure() === '${v['first']}' ? price : quantity }}</span>

measures: LenziPillOption<string>[] = [
  { value: '${v['first']}', label: '${v['first']}' },
  { value: '${v['second']}', label: '${v['second']}' },
];
measure = signal('${v['first']}');`,
    usageLanguage: 'html',
    height: 240,
  },
  {
    id: 'search-bar',
    name: 'Search bar',
    category: 'Actions and inputs',
    summary: 'An elongated circle like a browser’s bar: it searches as you type, a ✕ clears it.',
    api: '<lenzi-search-bar>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker substances search (styles.css .search-bar)',
    files: component('search-bar'),
    ...docs('src/lib/search-bar'),
    demo: () => import('./demos/search-bar-demo/search-bar-demo').then((m) => m.SearchBarDemo),
    controls: [
      { key: 'placeholder', label: 'What it looks for', type: 'text', default: 'Search substances and batches' },
      { key: 'debounce', label: 'Pause before searching (ms)', type: 'number', default: 300, min: 0, max: 1000, step: 50 },
    ],
    usage: (v) => `<lenzi-search-bar${attr('placeholder', v['placeholder'])}${v['debounce'] === 300 ? '' : ` [debounce]="${v['debounce']}"`} [value]="query()" (search)="search($event)" />`,
    usageLanguage: 'html',
    height: 380,
  },
  {
    id: 'period-picker',
    name: 'Period picker',
    category: 'Actions and inputs',
    summary: 'The period and the scale every figure over time is read in.',
    api: '<lenzi-period-picker>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/period-scale',
    files: component('period-picker'),
    ...docs('src/lib/period-picker'),
    demo: () => import('./demos/period-picker-demo/period-picker-demo').then((m) => m.PeriodPickerDemo),
    controls: [
      { key: 'period', label: 'Choose the period', type: 'boolean', default: true },
      { key: 'scale', label: 'Choose the scale', type: 'boolean', default: true },
    ],
    usage: (v) => `<div class="choices">
  <lenzi-period-picker${v['period'] ? ' [period]="days()" (periodChange)="days.set($event)"' : ''}${v['scale'] ? ' [scale]="per()" (scaleChange)="per.set($event)"' : ''} />
</div>`,
    usageLanguage: 'html',
    height: 360,
  },
  {
    id: 'card-menu',
    name: 'Card menu',
    category: 'Actions and inputs',
    summary: 'The ⋮ at a card’s top right: Edit, Delete; its taps never open the card.',
    api: '<lenzi-card-menu>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker substance, consumption and user cards',
    files: component('card-menu'),
    ...docs('src/lib/card-menu'),
    demo: () => import('./demos/card-menu-demo/card-menu-demo').then((m) => m.CardMenuDemo),
    controls: [
      { key: 'delete', label: 'A destructive action', type: 'boolean', default: true },
      { key: 'label', label: 'Accessible name', type: 'text', default: 'Actions for Birra' },
    ],
    usage: (v) => `<mat-card appearance="outlined" class="card" (click)="open()">
  <lenzi-card-menu class="menu"${attr('label', v['label'])} [actions]="actions" (action)="act($event)" />
  …
</mat-card>

actions: LenziMenuAction[] = [
  { id: 'edit', label: 'Edit', icon: 'edit' },${v['delete'] ? "\n  { id: 'delete', label: 'Delete', icon: 'delete', destructive: true }," : ''}
];`,
    usageLanguage: 'html',
    height: 340,
  },
  // Data -----------------------------------------------------------------------------------------
  {
    id: 'figure',
    name: 'Figure',
    category: 'Data',
    summary: 'What it is on top, bold; its value under it. Never two figures on one line.',
    api: '<lenzi-figure>, <lenzi-figure-grid>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker metrics panel',
    files: [...component('figure'), ...lib('figure', 'figure-grid.ts', 'figure-grid.css')],
    ...docs('src/lib/figure'),
    demo: () => import('./demos/figure-demo/figure-demo').then((m) => m.FigureDemo),
    controls: [
      { key: 'label', label: 'What it is', type: 'text', default: 'Stock' },
      { key: 'value', label: 'Value', type: 'text', default: '264 / 391 capsula' },
      { key: 'explain', label: 'Description under it', type: 'boolean', default: false },
    ],
    usage: (v) => `<lenzi-figure-grid>
  <lenzi-figure${attr('label', v['label'])}${attr('value', v['value'])}${v['explain'] ? ' description="What is left of the active batches."' : ''} />
  <lenzi-figure label="Spent" [value]="spent()" />
</lenzi-figure-grid>`,
    usageLanguage: 'html',
    height: 300,
  },
  {
    id: 'delta',
    name: 'Delta',
    category: 'Data',
    summary: 'A change from the one before: green or red by which way is good, with a triangle.',
    api: '<lenzi-delta>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/consumption-figures ("delta:", 2026-10-09)',
    files: component('delta'),
    ...docs('src/lib/delta'),
    demo: () => import('./demos/delta-demo/delta-demo').then((m) => m.DeltaDemo),
    controls: [
      { key: 'ratio', label: 'Ratio (the API’s)', type: 'number', default: -0.3333, min: -1, max: 1, step: 0.0001 },
      { key: 'none', label: 'Nothing to compare (—)', type: 'boolean', default: false },
      {
        key: 'good',
        label: 'Good when it goes',
        type: 'select',
        default: 'down',
        options: [
          { value: 'down', label: 'down' },
          { value: 'up', label: 'up' },
          { value: 'none', label: 'no colours' },
        ],
      },
      { key: 'label', label: 'Word', type: 'text', default: 'delta:' },
    ],
    usage: (v) => `<lenzi-delta [ratio]="${v['none'] ? 'null' : `'${v['ratio']}'`}"${v['good'] === 'down' ? '' : ` good="${v['good']}"`}${v['label'] === 'delta:' ? '' : attr('label', v['label'])} />`,
    usageLanguage: 'html',
    height: 220,
  },
  {
    id: 'identity-colour',
    name: 'Identity colours',
    category: 'Data',
    summary: 'A colour computed from an id, so the same thing is the same colour everywhere.',
    api: 'identityColor(), | lenziIdentityColor, <lenzi-identity-dot>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/identity-color-pipe (frozen, all violet since 2026-10-02)',
    files: lib('identity-dot', 'identity-color.ts', 'identity-color-pipe.ts', 'identity-dot.ts', 'identity-dot.css', 'identity-color-pipe.spec.ts'),
    ...docs('src/lib/identity-dot'),
    demo: () => import('./demos/identity-colour-demo/identity-colour-demo').then((m) => m.IdentityColourDemo),
    controls: [
      { key: 'count', label: 'Ids shown', type: 'number', default: 12, min: 1, max: 40, step: 1 },
      {
        key: 'offset',
        label: 'Kind of entity',
        type: 'select',
        default: '0',
        options: [
          { value: '0', label: 'first kind (offset 0)' },
          { value: '0.5', label: 'second kind (offset 0.5)' },
        ],
      },
    ],
    usage: (v) => `<lenzi-identity-dot [id]="substance.id"${v['offset'] === '0' ? '' : ` [offset]="${v['offset']}"`} /> {{ substance.name }}
<span [style.background-color]="batch.id | lenziIdentityColor${v['offset'] === '0' ? '' : `: ${v['offset']}`}"></span>`,
    usageLanguage: 'html',
    height: 380,
  },
  {
    id: 'segmented-bar',
    name: 'Segmented bar',
    category: 'Data',
    summary: 'A bar split in segments, each as wide as its share, with a tooltip that follows the mouse.',
    api: '<lenzi-segmented-bar>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/stock-bar and ui/batch-bar',
    files: component('segmented-bar'),
    ...docs('src/lib/segmented-bar'),
    demo: () => import('./demos/segmented-bar-demo/segmented-bar-demo').then((m) => m.SegmentedBarDemo),
    controls: [
      { key: 'count', label: 'Segments', type: 'number', default: 4, min: 1, max: 12, step: 1 },
      { key: 'used', label: 'Used up (%)', type: 'number', default: 30, min: 0, max: 100, step: 1 },
      { key: 'selectable', label: 'Selectable', type: 'boolean', default: true },
      { key: 'only', label: 'Only the first, alone', type: 'boolean', default: false },
    ],
    usage: (v) => `<lenzi-segmented-bar label="Stock: 272 capsula" [segments]="segments" [max]="stockBarMax"${v['only'] ? ' [only]="selected()"' : ''}${
      v['selectable'] ? ' selectable (segmentSelect)="select($event)"' : ''
    } [colorOffset]="0.5" />`,
    usageLanguage: 'html',
    height: 260,
  },
  {
    id: 'data-table',
    name: 'Data table',
    category: 'Data',
    summary: 'Rows of figures, the names fixed at the left, ordered by any column; it scrolls in its box.',
    api: '<lenzi-data-table>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/metrics-table',
    files: component('data-table'),
    ...docs('src/lib/data-table'),
    demo: () => import('./demos/data-table-demo/data-table-demo').then((m) => m.DataTableDemo),
    controls: [
      { key: 'rows', label: 'Rows', type: 'number', default: 5, min: 0, max: 12, step: 1 },
      { key: 'details', label: 'Details under the names', type: 'boolean', default: true },
    ],
    usage: () => `<lenzi-data-table
  nameHeader="Substance"
  label="Substances"
  [columns]="columns"
  [rows]="rows()"
  [sort]="sort()"
  [direction]="direction()"
  [format]="format"
  (sortChange)="order($event)"
  (opened)="open($event)"
/>`,
    usageLanguage: 'html',
    height: 420,
  },
  {
    id: 'widget-card',
    name: 'Widget card',
    category: 'Data',
    summary: 'The card of a chart: almost black, very round, an icon in a well, its own interval toggle.',
    api: '<lenzi-widget-card>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/widget (the reference photo, 2026-10-02)',
    files: component('widget-card'),
    ...docs('src/lib/widget-card'),
    demo: () => import('./demos/widget-card-demo/widget-card-demo').then((m) => m.WidgetCardDemo),
    controls: [
      { key: 'title', label: 'Title', type: 'text', default: 'Spent' },
      { key: 'icon', label: 'Icon', type: 'select', default: 'payments', options: ICONS },
      { key: 'subtitle', label: 'Subtitle', type: 'text', default: '' },
      { key: 'scales', label: 'Interval toggle', type: 'boolean', default: true },
    ],
    usage: (v) => `<lenzi-widget-card${attr('title', v['title'])}${attr('icon', v['icon'])}${attr('subtitle', v['subtitle'])}${
      v['scales'] ? ' [scales]="[\'day\', \'week\', \'month\']" [scale]="scale()" (scaleChange)="choose($event)"' : ''
    }>
  <lenzi-chart [data]="series()" type="stacked-bar" [format]="money" />
</lenzi-widget-card>`,
    usageLanguage: 'html',
    height: 480,
  },
  {
    id: 'chart',
    name: 'Chart',
    category: 'Data',
    summary: 'Bars, lines, donut, treemap and radar with ECharts, in the theme’s colours.',
    api: '<lenzi-chart>',
    entry: '@lenzi/ui-kit/charts',
    origin: 'substance-tracker ui/chart and chart-options.ts',
    files: ['charts/src/chart/chart.ts', 'charts/src/chart/chart-options.ts', 'charts/src/chart/chart.html', 'charts/src/chart/chart.css', 'charts/src/chart/chart-options.spec.ts'],
    ...docs('charts/src/chart'),
    demo: () => import('./demos/chart-demo/chart-demo').then((m) => m.ChartDemo),
    controls: [
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        default: 'stacked-bar',
        options: ['bar', 'stacked-bar', 'line', 'donut', 'treemap', 'radar'].map((value) => ({ value, label: value })),
      },
      { key: 'lines', label: 'Lines', type: 'number', default: 3, min: 1, max: 6, step: 1 },
      { key: 'periods', label: 'Periods', type: 'number', default: 8, min: 2, max: 24, step: 1 },
      { key: 'current', label: 'Last period in progress', type: 'boolean', default: true },
      { key: 'filters', label: 'Chips to hide lines', type: 'boolean', default: true },
    ],
    usage: (v) => `import { LenziChart, LenziChartData } from '@lenzi/ui-kit/charts';

<lenzi-chart [data]="data()" type="${v['type']}" [format]="money"${v['filters'] ? '' : ' [filters]="false"'} />

data: LenziChartData = {
  periods: ['W38', 'W39', 'W40'],${v['current'] ? '\n  current: 2, // the period still in progress' : ''}
  lines: [{ key: 'birra', name: 'Birra', color: identityColor(1), values: ['2.000', '3.500', '1.000'] }],
};`,
    usageLanguage: 'typescript',
    height: 460,
  },
  // Feedback -------------------------------------------------------------------------------------
  {
    id: 'status-message',
    name: 'Status message',
    category: 'Feedback',
    summary: 'What a list says instead of its content: "…", "No substances", or why it failed.',
    api: '<lenzi-status-message>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker pages and widgets ("Could not load …")',
    files: [...component('status-message'), 'src/lib/util/describe-error.ts'],
    ...docs('src/lib/status-message'),
    demo: () => import('./demos/status-message-demo/status-message-demo').then((m) => m.StatusMessageDemo),
    controls: [
      {
        key: 'kind',
        label: 'Kind',
        type: 'select',
        default: 'error',
        options: [
          { value: 'loading', label: 'loading' },
          { value: 'empty', label: 'empty' },
          { value: 'error', label: 'error' },
        ],
      },
      { key: 'text', label: 'Text', type: 'text', default: 'Could not load the substances: Not found (404)' },
      { key: 'compact', label: 'Compact (inside a list)', type: 'boolean', default: false },
    ],
    usage: (v) =>
      v['kind'] === 'error'
        ? `<lenzi-status-message kind="error" [text]="couldNotLoad('the substances', list.error())"${v['compact'] ? ' compact' : ''} />`
        : `<lenzi-status-message kind="${v['kind']}"${attr('text', v['text'])}${v['compact'] ? ' compact' : ''} />`,
    usageLanguage: 'html',
    height: 240,
  },
  {
    id: 'info-bar',
    name: 'Info bar',
    category: 'Feedback',
    summary: 'A bar that stands out from every page: offline, an update, acting as someone else.',
    api: '<lenzi-info-bar>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker offline bar, viewing-as bar, update bar',
    files: component('info-bar'),
    ...docs('src/lib/info-bar'),
    demo: () => import('./demos/info-bar-demo/info-bar-demo').then((m) => m.InfoBarDemo),
    controls: [
      { key: 'tone', label: 'Tone', type: 'select', default: 'tertiary', options: TONES },
      {
        key: 'icon',
        label: 'Icon',
        type: 'select',
        default: 'visibility',
        options: ['visibility', 'cloud_off', 'system_update', 'info'].map((value) => ({ value, label: value })),
      },
      { key: 'text', label: 'Text', type: 'text', default: 'Viewing as lenzi' },
      { key: 'action', label: 'Action', type: 'text', default: 'Exit' },
    ],
    usage: (v) => `<lenzi-info-bar${attr('icon', v['icon'])}${v['tone'] === 'neutral' ? '' : attr('tone', v['tone'])}${attr('actionLabel', v['action'])}${
      v['action'] ? ' (action)="exit()"' : ''
    }>${v['text']}</lenzi-info-bar>`,
    usageLanguage: 'html',
    height: 220,
  },
  {
    id: 'blocking-screen',
    name: 'Blocking screen',
    category: 'Feedback',
    summary: 'A screen over everything that cannot be closed, for what truly blocks the app.',
    api: '<lenzi-blocking-screen>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/update-notice ("Update required")',
    files: component('blocking-screen'),
    ...docs('src/lib/blocking-screen'),
    demo: () => import('./demos/blocking-screen-demo/blocking-screen-demo').then((m) => m.BlockingScreenDemo),
    controls: [
      { key: 'icon', label: 'Icon', type: 'select', default: 'system_update', options: ['system_update', 'dns', 'lock'].map((value) => ({ value, label: value })) },
      { key: 'title', label: 'Title', type: 'text', default: 'Update required' },
      { key: 'text', label: 'Text', type: 'text', default: 'This app (a26.0.0.0001) is older than your server and cannot work with it.' },
      { key: 'action', label: 'Way out', type: 'text', default: 'Download the update' },
      {
        key: 'kind',
        label: 'Way out style',
        type: 'select',
        default: 'flat',
        options: [
          { value: 'flat', label: 'flat (the one to take)' },
          { value: 'stroked', label: 'stroked (the only one)' },
        ],
      },
    ],
    usage: (v) => `@if (standing() === 'app-older') {
  <lenzi-blocking-screen${attr('icon', v['icon'])}${attr('title', v['title'])}${attr('actionLabel', v['action'])} [actionHref]="download()"${
    v['kind'] === 'flat' ? '' : ' actionKind="stroked"'
  }>
    ${v['text']}
  </lenzi-blocking-screen>
}`,
    usageLanguage: 'html',
    height: 480,
  },
  {
    id: 'pull-to-refresh',
    name: 'Pull to refresh',
    category: 'Feedback',
    summary: 'A pull from the top of a page asks for its data again: the gesture only, no button.',
    api: '<lenzi-pull-to-refresh>',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/pull-to-refresh (Android app, 2.11)',
    files: component('pull-to-refresh'),
    ...docs('src/lib/pull-to-refresh'),
    demo: () => import('./demos/pull-to-refresh-demo/pull-to-refresh-demo').then((m) => m.PullToRefreshDemo),
    controls: [{ key: 'duration', label: 'Refresh takes (ms)', type: 'number', default: 1200, min: 0, max: 5000, step: 100 }],
    usage: () => `<lenzi-app-shell>
  …
  @if (inApp) {
    <lenzi-pull-to-refresh lenziShellBelow [refresh]="refresh" />
  }
  <router-outlet />
</lenzi-app-shell>

refresh = () => this.pageRefresh.pull();`,
    usageLanguage: 'html',
    height: 420,
  },
  {
    id: 'notification-bell',
    name: 'Notification bell',
    category: 'Feedback',
    summary: 'A count of what arrived in the top bar; opened, the list, a tap opens one.',
    api: '<lenzi-notification-bell>',
    entry: '@lenzi/ui-kit',
    origin: 'vtiger-reader ui/bell',
    files: component('notification-bell'),
    ...docs('src/lib/notification-bell'),
    demo: () => import('./demos/notification-bell-demo/notification-bell-demo').then((m) => m.NotificationBellDemo),
    controls: [
      { key: 'count', label: 'Arrived', type: 'number', default: 3, min: 0, max: 8, step: 1 },
      { key: 'noun', label: 'They are called', type: 'text', default: 'tickets' },
    ],
    usage: (v) => `<lenzi-notification-bell lenziShellActions${attr('noun', v['noun'])} [items]="news()" (opened)="markSeen($event)" />`,
    usageLanguage: 'html',
    height: 420,
  },
  // Dialogs --------------------------------------------------------------------------------------
  {
    id: 'confirm-dialog',
    name: 'Confirm dialog',
    category: 'Dialogs',
    summary: 'Asks before an action and runs it: closes on success, says why on a failure.',
    api: 'LenziDialogs.open(LenziConfirmDialog, …)',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker and vtiger-reader confirm-dialog, substance-tracker history-dialogs',
    files: [...component('confirm-dialog'), 'src/lib/dialogs/dialogs.ts', 'src/lib/dialogs/dialogs.spec.ts'],
    ...docs('src/lib/confirm-dialog'),
    demo: () => import('./demos/confirm-dialog-demo/confirm-dialog-demo').then((m) => m.ConfirmDialogDemo),
    controls: [
      { key: 'title', label: 'Question', type: 'text', default: 'Delete this consumption?' },
      { key: 'message', label: 'What it costs', type: 'text', default: 'Its quantity goes back to its batch.' },
      { key: 'confirm', label: 'Confirm button', type: 'text', default: 'Delete' },
      { key: 'destructive', label: 'Destructive', type: 'boolean', default: true },
      {
        key: 'outcome',
        label: 'The action',
        type: 'select',
        default: 'success',
        options: [
          { value: 'success', label: 'succeeds' },
          { value: 'slow', label: 'takes 2 s' },
          { value: 'failure', label: 'fails (409)' },
        ],
      },
    ],
    usage: (v) => `const deleted = await this.dialogs.open<LenziConfirmDialog, LenziConfirmData, true>(LenziConfirmDialog, {
  title: '${v['title']}',
  message: '${v['message']}',
  confirm: '${v['confirm']}',${v['destructive'] ? '' : '\n  destructive: false,'}
  action: () => this.ledger.deleteConsumption(id),
});`,
    usageLanguage: 'typescript',
    height: 360,
  },
  // Services -------------------------------------------------------------------------------------
  {
    id: 'appearance',
    name: 'Setup and appearance',
    category: 'Services',
    summary: 'provideLenziKit() once per app; Reduce transparency, remembered by the browser.',
    api: 'provideLenziKit(), LenziAppearance',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/appearance.ts, app.config.ts',
    files: ['src/lib/provide-kit.ts', 'src/lib/appearance/appearance.ts', 'src/lib/appearance/appearance.spec.ts'],
    ...docs('src/lib/appearance'),
    demo: () => import('./demos/appearance-demo/appearance-demo').then((m) => m.AppearanceDemo),
    controls: [],
    usage: () => `// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([lenziErrorInterceptor])),
    provideLenziKit({ appId: 'substance-tracker' }),
  ],
};`,
    usageLanguage: 'typescript',
    height: 340,
  },
  {
    id: 'http',
    name: 'API errors',
    category: 'Services',
    summary: 'Every failed request becomes one ApiError: status, code, title, detail, field errors.',
    api: 'lenziErrorInterceptor, ApiError',
    entry: '@lenzi/ui-kit/http',
    origin: 'substance-tracker data/api-error.ts and error-interceptor.ts',
    files: ['http/src/api-error.ts', 'http/src/error-interceptor.ts', 'http/src/error-interceptor.spec.ts'],
    ...docs('http/src'),
    demo: () => import('./demos/http-demo/http-demo').then((m) => m.HttpDemo),
    controls: [
      {
        key: 'answer',
        label: 'The server answers',
        type: 'select',
        default: 'validation',
        options: [
          { value: 'validation', label: '400 with field errors' },
          { value: 'conflict', label: '409 Problem Details' },
          { value: 'plain', label: '500 without a body' },
          { value: 'down', label: 'nothing (network down)' },
        ],
      },
    ],
    usage: () => `import { ApiError, lenziErrorInterceptor, provideLenziHttp } from '@lenzi/ui-kit/http';

providers: [
  provideHttpClient(withFetch(), withInterceptors([lenziErrorInterceptor])),
  provideLenziHttp({ problemTypePrefix: 'urn:substance-tracker:problem:' }),
]`,
    usageLanguage: 'typescript',
    height: 420,
  },
  {
    id: 'utilities',
    name: 'Utilities',
    category: 'Services',
    summary: 'describeError(), couldNotLoad(), keptValue(), readPreference() and writePreference().',
    api: 'describeError(), keptValue(), readPreference()',
    entry: '@lenzi/ui-kit',
    origin: 'substance-tracker ui/kept-value.ts, ui/preferences.ts',
    files: ['src/lib/util/describe-error.ts', 'src/lib/util/kept-value.ts', 'src/lib/util/preferences.ts'],
    ...docs('src/lib/util'),
    demo: () => import('./demos/utilities-demo/utilities-demo').then((m) => m.UtilitiesDemo),
    controls: [
      { key: 'status', label: 'Status', type: 'number', default: 409, min: 0, max: 599, step: 1 },
      { key: 'title', label: 'Title', type: 'text', default: 'Conflict' },
      { key: 'detail', label: 'Detail', type: 'text', default: 'Batch 8 is finished' },
    ],
    usage: () => `// a list that keeps its rows while the next page loads (no shrinking, no blank)
readonly rows = keptValue(this.list, () => this.filter().substanceId);

// a choice of this browser, remembered
readonly per = signal(readPreference('my-app.per', (v) => (SCALES.includes(v) ? v : null), 'week'));`,
    usageLanguage: 'typescript',
    height: 360,
  },
  // 3D -------------------------------------------------------------------------------------------
  {
    id: 'three-canvas',
    name: 'three.js canvas',
    category: '3D',
    summary: 'A 3D view in the theme’s colours that pauses out of view and frees its GPU memory.',
    api: '<lenzi-three-canvas>',
    entry: '@lenzi/ui-kit/three',
    origin: 'new (lenzi, 2026-11-12: "we don\'t use it now, but we might")',
    files: ['three/src/three-canvas/three-canvas.ts', 'three/src/three-canvas/three-canvas.html', 'three/src/three-canvas/three-canvas.css', 'three/src/three-canvas/three-canvas.spec.ts'],
    ...docs('three/src/three-canvas'),
    demo: () => import('./demos/three-canvas-demo/three-canvas-demo').then((m) => m.ThreeCanvasDemo),
    controls: [
      { key: 'animate', label: 'Turning', type: 'boolean', default: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.6, min: 0, max: 3, step: 0.1 },
      { key: 'detail', label: 'Detail', type: 'number', default: 1, min: 0, max: 4, step: 1 },
      { key: 'wireframe', label: 'Wireframe', type: 'boolean', default: false },
      {
        key: 'color',
        label: 'Colour',
        type: 'select',
        default: '--mat-sys-primary',
        options: ['--mat-sys-primary', '--mat-sys-tertiary', '--mat-sys-secondary', '--lenzi-status-good'].map((value) => ({ value, label: value })),
      },
    ],
    usage: (v) => `import { LenziThreeCanvas, LenziThreeSetup } from '@lenzi/ui-kit/three';
import { IcosahedronGeometry, Mesh, MeshStandardMaterial, DirectionalLight, AmbientLight } from 'three';

<lenzi-three-canvas [setup]="scene" label="A violet icosahedron, turning"${v['animate'] ? '' : ' [animate]="false"'} />

scene: LenziThreeSetup = ({ scene, color }) => {
  const shape = new Mesh(new IcosahedronGeometry(1.4, ${v['detail']}), new MeshStandardMaterial({ color: color('${v['color']}')${v['wireframe'] ? ', wireframe: true' : ''} }));
  scene.add(shape, new AmbientLight(0xffffff, 0.6), new DirectionalLight(0xffffff, 2.4));
  return { frame: (delta) => (shape.rotation.y += delta * ${v['speed']}) };
};`,
    usageLanguage: 'typescript',
    height: 420,
  },
];

/** A doc's page, by id. */
export function docById(id: string): KitDoc | undefined {
  return DOCS.find((doc) => doc.id === id);
}

/** The values a demo starts with: every control's default. */
export function defaults(doc: KitDoc): Values {
  return Object.fromEntries(doc.controls.map((control) => [control.key, control.default]));
}
