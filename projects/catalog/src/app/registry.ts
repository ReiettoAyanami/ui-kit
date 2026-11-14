// Every page of the catalog that documents a piece of the kit: what it is, where it comes from,
// which files show its code, its rules and AI notes, its demo and the parameters the GUI changes.
// A plain data module (no schematic makes one). Paths are relative to the kit's folder
// (projects/kit), which the catalog serves under `kit-src/` (angular.json, assets).
import { Type } from '@angular/core';

export type ControlType = 'text' | 'number' | 'boolean' | 'select' | 'color';

export type Value = string | number | boolean;

/**
 * How a parameter is written in the usage code, so that editing the code moves it back (lenzi,
 * 2026-11-12: code you can edit, "and they will take effect"):
 * - nothing given: an attribute named as the parameter: `label="…"`, `[label]="'…'"`, `[n]="3"`, a bare
 *   `compact`, or a property `label: '…'`, `n: 3`;
 * - `attr`: the same, with another name; `match`: the regex's first group (a boolean: whether it
 *   matches); `absent`: a boolean, true when the regex does NOT match; `all`: every match, joined;
 *   `nth`: the n-th match; `false`: the code does not carry it (the GUI alone sets it).
 * `otherwise`: its value when the code does not have it (default: the control's default; a boolean false).
 */
export type CodeSpec =
  | false
  | { attr: string; otherwise?: Value }
  | { match: RegExp; otherwise?: Value }
  | { absent: RegExp }
  | { all: RegExp; join: string; otherwise?: Value }
  | { nth: RegExp; index: number; otherwise?: Value };

/** One parameter of a demo, as the GUI shows it. */
export interface Control {
  key: string;
  label: string;
  type: ControlType;
  default: Value;
  options?: readonly { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  /** How the usage code writes it; nothing: an attribute with its key's name. */
  code?: CodeSpec;
}

export type Values = Record<string, Value>;

export const CATEGORIES = [
  'Foundations',
  "Material, the kit's way",
  'Layout',
  'Actions and inputs',
  'Data',
  'Feedback',
  'Dialogs',
  'Services',
  'Backgrounds',
  'Light',
  '3D',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Entry = '@lenzi/ui-kit' | '@lenzi/ui-kit/charts' | '@lenzi/ui-kit/three' | '@lenzi/ui-kit/http' | '@lenzi/ui-kit/backgrounds' | 'styles';

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

/** A tag with one attribute a line: only the attributes given (the others are as the piece has them by itself). */
const tag = (name: string, attributes: readonly string[]) => {
  const written = attributes.filter(Boolean);
  return written.length ? `<${name}\n${written.map((attribute) => `  ${attribute}`).join('\n')}\n/>` : `<${name} />`;
};
/** An attribute only when it is not the piece's own value: bound (`[n]="3"`) or plain (`n="three"`). */
const bound = (name: string, value: Value | undefined, standard: Value) => (value === undefined || value === standard ? '' : `[${name}]="${value}"`);
const plain = (name: string, value: Value | undefined, standard: Value) => (value === undefined || value === standard ? '' : `${name}="${value}"`);

const BACKGROUND_FILES = (folder: string) => ['ts', 'html', 'css', 'spec.ts'].map((extension) => `backgrounds/src/${folder}/${folder}.${extension}`);
const GLOW_FILES = ['backgrounds/src/glow-background/glow-background.ts', 'backgrounds/src/glow-background/glow-background.css', 'backgrounds/src/engine/glow-engine.ts', 'backgrounds/src/engine/color.ts'];
const ACCENTS = ['--mat-sys-primary', '--mat-sys-tertiary', '--mat-sys-secondary', '--lenzi-status-good'].map((value) => ({ value, label: value }));
const BASES = [
  { value: '--mat-sys-surface', label: 'the page (--mat-sys-surface)' },
  { value: '--mat-sys-surface-container-lowest', label: 'almost black (--mat-sys-surface-container-lowest)' },
  { value: '#f3eefc', label: 'a light page (#f3eefc)' },
];
const BLOB_SHAPE_CHOICES = ['circle', 'squircle', 'triangle', 'pentagon', 'hexagon', 'clover4', 'clover8', 'flower', 'cookie6', 'cookie9', 'cookie12', 'sunny', 'burst'];

/** What every glowing background takes: its colours, its glow, its blur, its time. */
const GLOW_CONTROLS: readonly Control[] = [
  { key: 'accent', label: 'Accent', type: 'select', default: '--mat-sys-primary', options: ACCENTS },
  { key: 'base', label: 'Colour under them', type: 'select', default: '--mat-sys-surface', options: BASES },
  { key: 'spread', label: 'Colours apart (0 the same, 1 a lot)', type: 'number', default: 0.2, min: 0, max: 1, step: 0.05 },
  { key: 'seed', label: 'Seed', type: 'number', default: 1, min: 1, max: 99, step: 1 },
  { key: 'brightness', label: 'Brightness of the objects', type: 'number', default: 1, min: 0, max: 3, step: 0.1 },
  { key: 'glow', label: 'Glow', type: 'number', default: 1, min: 0, max: 3, step: 0.1 },
  { key: 'halo', label: 'Glow width (0 tight, 1 wide)', type: 'number', default: 0.6, min: 0, max: 1, step: 0.05 },
  { key: 'blur', label: 'Blur of the picture (px)', type: 'number', default: 0, min: 0, max: 80, step: 1 },
  { key: 'speed', label: 'Speed of time', type: 'number', default: 1, min: 0, max: 3, step: 0.1 },
  { key: 'animate', label: 'Moving', type: 'boolean', default: true, code: { attr: 'animate', otherwise: true } },
];
const glowAttributes = (v: Values) => [
  plain('accent', v['accent'], '--mat-sys-primary'),
  plain('base', v['base'], '--mat-sys-surface'),
  bound('spread', v['spread'], 0.2),
  bound('seed', v['seed'], 1),
  bound('brightness', v['brightness'], 1),
  bound('glow', v['glow'], 1),
  bound('halo', v['halo'], 0.6),
  bound('blur', v['blur'], 0),
  bound('speed', v['speed'], 1),
  bound('animate', v['animate'], true),
];

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
        code: false,
      },
    ],
    usage: () => `// angular.json, "styles" (ng add puts them there): the kit's look, then the app's own
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
    files: ['src/styles/global.css'],
    ...styleDocs('glass-motion'),
    demo: () => import('./demos/glass-motion-demo/glass-motion-demo').then((m) => m.GlassMotionDemo),
    controls: [
      { key: 'reduce', label: 'Reduce transparency', type: 'boolean', default: false, code: { match: /setReduceTransparency\(true\)/ } },
      { key: 'glass', label: 'Window opacity (%)', type: 'number', default: 56, min: 0, max: 100, step: 1, code: { match: /--lenzi-glass:\s*(-?[\d.]+)%/ } },
      { key: 'blur', label: 'Glass blur (px)', type: 'number', default: 24, min: 0, max: 64, step: 1, code: { match: /--lenzi-glass-blur:\s*(-?[\d.]+)px/ } },
    ],
    usage: (v) => `/* The glass is global: these variables (the Variables page saves them into the kit) */
:root {
  --lenzi-glass: ${v['glass']}%;
  --lenzi-glass-blur: ${v['blur']}px;
}

/* Reduce transparency, a choice of the browser: LenziAppearance.setReduceTransparency(${v['reduce']}) */`,
usageLanguage: 'scss',
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
    files: ['src/styles/global.css'],
    ...styleDocs('borders-shape'),
    demo: () => import('./demos/borders-shape-demo/borders-shape-demo').then((m) => m.BordersShapeDemo),
    controls: [
      { key: 'border', label: 'Border width (px)', type: 'number', default: 2, min: 1, max: 4, step: 1, code: { match: /--lenzi-border:\s*(-?[\d.]+)px/ } },
    ],
    usage: (v) => `:root {
  --lenzi-border: ${v['border']}px;
}

.my-sub-card {
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
      {
        key: 'options',
        label: 'Choices (comma separated)',
        type: 'text',
        default: 'last,average',
        code: { all: /<mat-button-toggle value="([^"]+)">/g, join: ',' },
      },
      { key: 'indicator', label: 'Check mark on the chosen one', type: 'boolean', default: false, code: { absent: /hideSingleSelectionIndicator/ } },
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
    controls: [{ key: 'described', label: 'Options with a description', type: 'boolean', default: false, code: { match: /lenzi-described-options/ } }],
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
      { key: 'text', label: 'First line', type: 'text', default: 'Peroni 6-pack', code: { match: /(?:matTooltip="|\[matTooltip\]="')([^'"\\]*)/ } },
      { key: 'second', label: 'Second line', type: 'text', default: '€1.20/bottiglia', code: { match: /\\n([^'"]*)'/, otherwise: '' } },
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
      { key: 'flat', label: 'Flat', type: 'boolean', default: false, code: { match: /class="lenzi-flat"/ } },
      {
        key: 'description',
        label: 'Header description',
        type: 'text',
        default: 'Last 30 days',
        code: { match: /<mat-panel-description>([^<]*)<\/mat-panel-description>/, otherwise: '' },
      },
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
      { key: 'title', label: 'Title', type: 'text', default: 'Consumptions', code: { attr: 'title', otherwise: '' } },
      { key: 'actions', label: 'A bell in the top bar', type: 'boolean', default: true, code: { match: /lenziShellActions/ } },
      { key: 'banner', label: 'A bar above it (Viewing as)', type: 'boolean', default: false, code: { match: /lenziShellBanner/ } },
      { key: 'below', label: 'A bar under it (Offline)', type: 'boolean', default: false, code: { match: /lenziShellBelow/ } },
      { key: 'bare', label: 'Bare (the page alone)', type: 'boolean', default: false, code: { match: /\[bare\]="true"/ } },
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
      { key: 'subtitle', label: 'Signed in as', type: 'text', default: 'lenzi', code: { attr: 'subtitle', otherwise: '' } },
      { key: 'bottom', label: 'Entries at the bottom', type: 'boolean', default: true, code: { match: /\[bottom\]/ } },
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
    usage: (v) => `<!-- the app's last route: { path: '**', component: NotFoundPage } -->
<lenzi-not-found${v['title'] === 'Page not found' ? '' : attr('title', v['title'])}${
      v['text'] === 'There is nothing at this address.' ? '' : attr('text', v['text'])
    }${attr('linkLabel', v['linkLabel'])} link="/" />`,
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
    usage: (v) => `<lenzi-version-label version="${v['version']}" />
<!-- in an app, the version the API says: [version]="version.value() ?? null" -->`,
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
      { key: 'first', label: 'First state', type: 'text', default: 'price', code: { nth: /\{ value: '[^']*', label: '([^']*)' \}/g, index: 0 } },
      { key: 'second', label: 'Second state', type: 'text', default: 'qty', code: { nth: /\{ value: '[^']*', label: '([^']*)' \}/g, index: 1 } },
    ],
    usage: (v) => `<lenzi-pill-toggle [options]="measures" [(value)]="measure" />
<span class="figure">{{ measure() === 'first' ? price : quantity }}</span>

measures: LenziPillOption<string>[] = [
  { value: 'first', label: '${v['first']}' },
  { value: 'second', label: '${v['second']}' },
];
measure = signal('first');`,
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
      { key: 'period', label: 'Choose the period', type: 'boolean', default: true, code: { match: /\[period\]/ } },
      { key: 'scale', label: 'Choose the scale', type: 'boolean', default: true, code: { match: /\[scale\]/ } },
    ],
    usage: (v) => `<div class="choices">
  <lenzi-period-picker${v['period'] ? ' [period]="days()" (periodChange)="days.set($event)"' : ''}${v['scale'] ? ' [scale]="per()" (scaleChange)="per.set($event)"' : ''} />
</div>`,
usageLanguage: 'html',
    height: 360,
  },
  {
    id: 'color-picker',
    name: 'Colour picker',
    category: 'Actions and inputs',
    summary: 'A colour you change from the colour itself: a round swatch that opens a glass colour selector, with a way back.',
    api: '<lenzi-color-picker>',
    entry: '@lenzi/ui-kit',
    origin: 'new in the kit, 2026-11-12 ("fammi cliccare sul colore e mostrare un selector di colore")',
    files: [...component('color-picker'), ...lib('color-picker', 'color.ts', 'color.spec.ts')],
    ...docs('src/lib/color-picker'),
    demo: () => import('./demos/color-picker-demo/color-picker-demo').then((m) => m.ColorPickerDemo),
    controls: [
      { key: 'label', label: 'What the colour is (screen readers)', type: 'text', default: 'Shift colour' },
      { key: 'value', label: 'Colour', type: 'color', default: '#d5baff', code: { match: /colour = signal\('([^']*)'\)/ } },
      { key: 'size', label: 'Size of the swatch (px)', type: 'number', default: 32, min: 24, max: 56, step: 4 },
      { key: 'choices', label: 'Offer the app’s colours', type: 'boolean', default: true, code: { match: /\[choices\]/ } },
      { key: 'confirm', label: 'Ask to keep the new colour (snackbar)', type: 'boolean', default: true, code: { attr: 'confirm', otherwise: true } },
      { key: 'disabled', label: 'Disabled', type: 'boolean', default: false },
    ],
    usage: (v) => `<lenzi-color-picker${attr('label', v['label'])} [(value)]="colour"${v['size'] === 32 ? '' : ` [size]="${v['size']}"`}${v['choices'] ? ' [choices]="palette"' : ''}${v['confirm'] ? '' : ' [confirm]="false"'}${v['disabled'] ? ' disabled' : ''} (picked)="save($event)" />

colour = signal('${v['value']}');`,
usageLanguage: 'html',
    height: 520,
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
      { key: 'delete', label: 'A destructive action', type: 'boolean', default: true, code: { match: /id: 'delete'/ } },
      { key: 'label', label: 'Accessible name', type: 'text', default: 'Actions for Birra', code: { match: /<lenzi-card-menu[^>]*\slabel="([^"]*)"/, otherwise: '' } },
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
      { key: 'value', label: 'Value', type: 'text', default: '264 / 391 capsula', code: { attr: 'value', otherwise: '' } },
      { key: 'explain', label: 'Description under it', type: 'boolean', default: false, code: { match: /\sdescription="/ } },
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
      { key: 'none', label: 'Nothing to compare (—)', type: 'boolean', default: false, code: { match: /\[ratio\]="null"/ } },
      {
        key: 'good',
        label: 'Good when it goes',
        type: 'select',
        default: 'up',
        options: [
          { value: 'up', label: 'up' },
          { value: 'down', label: 'down' },
          { value: 'none', label: 'no colours' },
        ],
        code: { attr: 'good', otherwise: 'up' },
      },
      { key: 'label', label: 'Word', type: 'text', default: 'delta:', code: { attr: 'label', otherwise: 'delta:' } },
    ],
    usage: (v) =>
      `<lenzi-delta [ratio]="${v['none'] ? 'null' : `'${v['ratio']}'`}"${v['good'] === 'up' ? '' : ` good="${v['good']}"`}${v['label'] === 'delta:' ? '' : attr('label', v['label'])} />`,
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
      { key: 'count', label: 'Ids shown', type: 'number', default: 12, min: 1, max: 40, step: 1, code: false },
      {
        key: 'offset',
        label: 'Kind of entity',
        type: 'select',
        default: '0',
        options: [
          { value: '0', label: 'first kind (offset 0)' },
          { value: '0.5', label: 'second kind (offset 0.5)' },
        ],
        code: { match: /\[offset\]="([\d.]+)"/, otherwise: '0' },
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
      { key: 'count', label: 'Segments', type: 'number', default: 4, min: 1, max: 12, step: 1, code: false },
      { key: 'used', label: 'Used up (%)', type: 'number', default: 30, min: 0, max: 100, step: 1, code: false },
      { key: 'selectable', label: 'Selectable', type: 'boolean', default: true, code: { match: /\sselectable[\s/>]/ } },
      { key: 'only', label: 'Only the first, alone', type: 'boolean', default: false, code: { match: /\[only\]/ } },
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
      { key: 'rows', label: 'Rows', type: 'number', default: 5, min: 0, max: 12, step: 1, code: false },
      { key: 'details', label: 'Details under the names', type: 'boolean', default: true, code: false },
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
      { key: 'subtitle', label: 'Subtitle', type: 'text', default: '', code: { attr: 'subtitle', otherwise: '' } },
      { key: 'scales', label: 'Interval toggle', type: 'boolean', default: true, code: { match: /\[scales\]/ } },
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
        code: { match: /<lenzi-chart[^>]*\stype="([^"]+)"/ },
      },
      { key: 'lines', label: 'Lines', type: 'number', default: 3, min: 1, max: 6, step: 1, code: false },
      { key: 'periods', label: 'Periods', type: 'number', default: 8, min: 2, max: 24, step: 1, code: false },
      { key: 'current', label: 'Last period in progress', type: 'boolean', default: true, code: { match: /current: \d+/ } },
      { key: 'filters', label: 'Chips to hide lines', type: 'boolean', default: true, code: { absent: /\[filters\]="false"/ } },
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
        code: { attr: 'kind', otherwise: 'empty' },
      },
      { key: 'text', label: 'Text', type: 'text', default: 'Could not load the substances: Not found (404)', code: { attr: 'text', otherwise: '' } },
      { key: 'compact', label: 'Compact (inside a list)', type: 'boolean', default: false, code: { match: /\scompact[\s/>]/ } },
    ],
    usage: (v) =>
      `<lenzi-status-message${v['kind'] === 'empty' ? '' : attr('kind', v['kind'])}${attr('text', v['text'])}${v['compact'] ? ' compact' : ''} />${
        v['kind'] === 'error' ? `\n<!-- in a page, the error of its resource: [text]="couldNotLoad('the substances', list.error())" -->` : ''
      }`,
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
      { key: 'tone', label: 'Tone', type: 'select', default: 'tertiary', options: TONES, code: { attr: 'tone', otherwise: 'neutral' } },
      {
        key: 'icon',
        label: 'Icon',
        type: 'select',
        default: 'visibility',
        options: ['visibility', 'cloud_off', 'system_update', 'info'].map((value) => ({ value, label: value })),
      },
      { key: 'text', label: 'Text', type: 'text', default: 'Viewing as lenzi', code: { match: />([^<]*)<\/lenzi-info-bar>/, otherwise: '' } },
      { key: 'action', label: 'Action', type: 'text', default: 'Exit', code: { attr: 'actionLabel', otherwise: '' } },
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
      {
        key: 'text',
        label: 'Text',
        type: 'text',
        default: 'This app (a26.0.0.0001) is older than your server and cannot work with it.',
        code: { match: /<lenzi-blocking-screen[^>]*>\s*([^<]*?)\s*<\/lenzi-blocking-screen>/, otherwise: '' },
      },
      { key: 'action', label: 'Way out', type: 'text', default: 'Download the update', code: { attr: 'actionLabel', otherwise: '' } },
      {
        key: 'kind',
        label: 'Way out style',
        type: 'select',
        default: 'flat',
        options: [
          { value: 'flat', label: 'flat (the one to take)' },
          { value: 'stroked', label: 'stroked (the only one)' },
        ],
        code: { attr: 'actionKind', otherwise: 'flat' },
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
    controls: [
      { key: 'duration', label: 'Refresh takes (ms)', type: 'number', default: 1200, min: 0, max: 5000, step: 100, code: { match: /setTimeout\(resolve, (\d+)\)/ } },
    ],
    usage: (v) => `<lenzi-app-shell>
  …
  @if (inApp) {
    <lenzi-pull-to-refresh lenziShellBelow [refresh]="refresh" />
  }
  <router-outlet />
</lenzi-app-shell>

// in an app: refresh = () => this.pageRefresh.pull();
refresh = () => new Promise((resolve) => setTimeout(resolve, ${v['duration']}));`,
usageLanguage: 'typescript',
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
      { key: 'count', label: 'Arrived', type: 'number', default: 3, min: 0, max: 8, step: 1, code: false },
      { key: 'noun', label: 'They are called', type: 'text', default: 'tickets', code: { attr: 'noun', otherwise: 'notifications' } },
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
      { key: 'destructive', label: 'Destructive', type: 'boolean', default: true, code: { absent: /destructive: false/ } },
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
        code: false,
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
        code: false,
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
    usage: (v) => `// one line for a failure: "${v['detail'] || v['title']}${v['status'] ? ` (${v['status']})` : ''}"
describeError({ status: ${v['status']}, title: '${v['title']}', detail: '${v['detail']}' });

// a list that keeps its rows while the next page loads (no shrinking, no blank)
readonly rows = keptValue(this.list, () => this.filter().substanceId);

// a choice of this browser, remembered
readonly per = signal(readPreference('my-app.per', (v) => (SCALES.includes(v) ? v : null), 'week'));`,
usageLanguage: 'typescript',
    height: 360,
  },
  // Backgrounds ----------------------------------------------------------------------------------
  {
    id: 'background',
    name: 'Background',
    category: 'Backgrounds',
    summary: 'A plain background behind a page or a box: a colour, a gradient over it, a photo under the gradient.',
    api: '<lenzi-background>',
    entry: '@lenzi/ui-kit/backgrounds',
    origin: 'new in the kit, 2026-11-13 ("normal (color, photo, ecc)")',
    files: BACKGROUND_FILES('background'),
    ...docs('backgrounds/src/background'),
    demo: () => import('./demos/background-demo/background-demo').then((m) => m.BackgroundDemo),
    controls: [
      {
        key: 'color',
        label: 'Colour',
        type: 'select',
        default: '--mat-sys-surface',
        options: ['--mat-sys-surface', '--mat-sys-surface-container-lowest', '--mat-sys-primary-container'].map((value) => ({ value, label: value })),
      },
      {
        key: 'gradient',
        label: 'Gradient over it',
        type: 'select',
        default: 'linear-gradient(to top, var(--mat-sys-surface), transparent 60%)',
        options: [
          { value: 'none', label: 'none' },
          { value: 'radial-gradient(120% 90% at 50% 0%, color-mix(in oklch, var(--mat-sys-primary) 45%, transparent), transparent 70%)', label: 'the accent, from the top' },
          { value: 'linear-gradient(135deg, color-mix(in oklch, var(--mat-sys-primary) 40%, transparent), color-mix(in oklch, var(--mat-sys-tertiary) 30%, transparent))', label: 'the two accents, across' },
          { value: 'linear-gradient(to top, var(--mat-sys-surface), transparent 60%)', label: 'the page, rising from the bottom' },
        ],
        code: { attr: 'gradient', otherwise: 'none' },
      },
      { key: 'image', label: 'Photo (an address)', type: 'text', default: 'demo/hills.svg', code: { attr: 'image', otherwise: '' } },
      {
        key: 'fit',
        label: 'The photo',
        type: 'select',
        default: 'cover',
        options: [
          { value: 'cover', label: 'covers the space' },
          { value: 'contain', label: 'whole inside it' },
          { value: 'tile', label: 'repeated' },
        ],
      },
      { key: 'dim', label: 'Colour back over the picture (0 to 1)', type: 'number', default: 0, min: 0, max: 1, step: 0.05 },
      { key: 'blur', label: 'Blur of the picture (px)', type: 'number', default: 0, min: 0, max: 80, step: 1 },
    ],
    usage: (v) => `import { LenziBackground } from '@lenzi/ui-kit/backgrounds';

${tag('lenzi-background', [
  plain('color', v['color'], '--mat-sys-surface'),
  plain('gradient', v['gradient'], 'none'),
  plain('image', v['image'], ''),
  plain('fit', v['fit'], 'cover'),
  bound('dim', v['dim'], 0),
  bound('blur', v['blur'], 0),
])}`,
    usageLanguage: 'html',
    height: 420,
  },
  {
    id: 'blob-background',
    name: 'Blob background',
    category: 'Backgrounds',
    summary: 'Glowing soft shapes in the accent colour that drift, change shape and melt into each other.',
    api: '<lenzi-blob-background>',
    entry: '@lenzi/ui-kit/backgrounds',
    origin: 'new in the kit, 2026-11-13 ("supershapes like the ones that materialui uses ... able to merge together")',
    files: [...BACKGROUND_FILES('blob-background'), 'backgrounds/src/engine/blob-field.ts', 'backgrounds/src/engine/blob-scene.ts', 'backgrounds/src/engine/shapes.ts', ...GLOW_FILES],
    ...docs('backgrounds/src/blob-background'),
    demo: () => import('./demos/blob-background-demo/blob-background-demo').then((m) => m.BlobBackgroundDemo),
    controls: [
      { key: 'count', label: 'Blobs', type: 'number', default: 6, min: 1, max: 16, step: 1 },
      { key: 'size', label: 'Size (share of the smaller side)', type: 'number', default: 0.2, min: 0.04, max: 0.6, step: 0.01 },
      { key: 'sizeVariety', label: 'Sizes apart (0 the same, 1 a lot)', type: 'number', default: 0.45, min: 0, max: 1, step: 0.05 },
      { key: 'travel', label: 'How far they wander (0 to 1)', type: 'number', default: 0.6, min: 0, max: 1, step: 0.05 },
      { key: 'morph', label: 'Shape changes (0 never, 1 every 6 s)', type: 'number', default: 0.5, min: 0, max: 3, step: 0.1 },
      { key: 'spin', label: 'Turns a minute', type: 'number', default: 1.2, min: 0, max: 12, step: 0.1 },
      {
        key: 'shapes',
        label: 'Shapes',
        type: 'select',
        default: 'mixed',
        options: [{ value: 'mixed', label: "mixed (the kit's choice)" }, ...BLOB_SHAPE_CHOICES.map((value) => ({ value, label: value }))],
        code: { match: /\[shapes\]="\['([a-z0-9]+)'\]"/, otherwise: 'mixed' },
      },
      { key: 'merge', label: 'How softly they join (0 to 1)', type: 'number', default: 0.35, min: 0, max: 1, step: 0.05 },
      { key: 'soft', label: 'Soft edge (px)', type: 'number', default: 2, min: 0, max: 80, step: 1 },
      { key: 'pull', label: 'Drawn by the pointer (0 to 1)', type: 'number', default: 0, min: 0, max: 1, step: 0.05 },
      ...GLOW_CONTROLS,
    ],
    usage: (v) => `import { LenziBlobBackground } from '@lenzi/ui-kit/backgrounds';

${tag('lenzi-blob-background', [
  bound('count', v['count'], 6),
  bound('size', v['size'], 0.2),
  bound('sizeVariety', v['sizeVariety'], 0.45),
  bound('travel', v['travel'], 0.6),
  bound('morph', v['morph'], 0.5),
  bound('spin', v['spin'], 1.2),
  v['shapes'] === 'mixed' ? '' : `[shapes]="['${v['shapes']}']"`,
  bound('merge', v['merge'], 0.35),
  bound('soft', v['soft'], 2),
  bound('pull', v['pull'], 0),
  ...glowAttributes(v),
])}`,
    usageLanguage: 'html',
    height: 520,
  },
  {
    id: 'flock-background',
    name: 'Flock background',
    category: 'Backgrounds',
    summary: 'A glowing flock of boids in the accent colour that follows the pointer; every number of the flock is a parameter.',
    api: '<lenzi-flock-background>',
    entry: '@lenzi/ui-kit/backgrounds',
    origin: 'new in the kit, 2026-11-13 ("The flocks need to be following the mouse ... every variable should be configurable")',
    files: [...BACKGROUND_FILES('flock-background'), 'backgrounds/src/engine/boids.ts', 'backgrounds/src/engine/boids.spec.ts', 'backgrounds/src/engine/flock-scene.ts', ...GLOW_FILES],
    ...docs('backgrounds/src/flock-background'),
    demo: () => import('./demos/flock-background-demo/flock-background-demo').then((m) => m.FlockBackgroundDemo),
    controls: [
      { key: 'count', label: 'Boids', type: 'number', default: 240, min: 0, max: 4000, step: 10 },
      {
        key: 'follow',
        label: 'The pointer',
        type: 'select',
        default: 'near',
        options: [
          { value: 'near', label: 'near: around it, loosely' },
          { value: 'target', label: 'target: onto it, slowing to a stop' },
          { value: 'none', label: 'none: not followed' },
        ],
      },
      { key: 'followWeight', label: 'Weight of the pointer', type: 'number', default: 0.9, min: 0, max: 5, step: 0.1 },
      { key: 'followRadius', label: 'Distance where the pull fades (px)', type: 'number', default: 140, min: 10, max: 600, step: 10 },
      { key: 'separation', label: 'Keep apart (weight)', type: 'number', default: 1.6, min: 0, max: 5, step: 0.1 },
      { key: 'alignment', label: 'Head the same way (weight)', type: 'number', default: 1, min: 0, max: 5, step: 0.1 },
      { key: 'cohesion', label: 'Stay together (weight)', type: 'number', default: 0.9, min: 0, max: 5, step: 0.1 },
      { key: 'separationDistance', label: 'Too close (px)', type: 'number', default: 26, min: 0, max: 150, step: 1 },
      { key: 'perception', label: 'How far a boid sees (px)', type: 'number', default: 70, min: 10, max: 300, step: 5 },
      { key: 'viewAngle', label: 'How wide it sees (degrees)', type: 'number', default: 270, min: 30, max: 360, step: 10 },
      { key: 'maxSpeed', label: 'Fastest (px/s)', type: 'number', default: 150, min: 20, max: 600, step: 10 },
      { key: 'minSpeed', label: 'Slowest (px/s)', type: 'number', default: 60, min: 0, max: 300, step: 10 },
      { key: 'maxForce', label: 'How hard it turns (px/s²)', type: 'number', default: 220, min: 10, max: 1000, step: 10 },
      { key: 'wander', label: 'Turns of its own (0 none)', type: 'number', default: 0.25, min: 0, max: 2, step: 0.05 },
      {
        key: 'edges',
        label: 'At the edges',
        type: 'select',
        default: 'wrap',
        options: [
          { value: 'wrap', label: 'wrap: back in from the other side' },
          { value: 'avoid', label: 'avoid: turns away before them' },
        ],
      },
      { key: 'edgeMargin', label: 'Turns away from (px)', type: 'number', default: 80, min: 0, max: 300, step: 10 },
      { key: 'boidSize', label: 'Width of a boid (px)', type: 'number', default: 7, min: 2, max: 40, step: 1 },
      {
        key: 'shape',
        label: 'A boid is',
        type: 'select',
        default: 'dart',
        options: [
          { value: 'dart', label: 'a dart, pointing where it flies' },
          { value: 'dot', label: 'a dot' },
        ],
      },
      { key: 'trails', label: 'Trails (0 none, 1 long)', type: 'number', default: 0, min: 0, max: 1, step: 0.05 },
      ...GLOW_CONTROLS,
    ],
    usage: (v) => `import { LenziFlockBackground } from '@lenzi/ui-kit/backgrounds';

${tag('lenzi-flock-background', [
  bound('count', v['count'], 240),
  plain('follow', v['follow'], 'near'),
  bound('followWeight', v['followWeight'], 0.9),
  bound('followRadius', v['followRadius'], 140),
  bound('separation', v['separation'], 1.6),
  bound('alignment', v['alignment'], 1),
  bound('cohesion', v['cohesion'], 0.9),
  bound('separationDistance', v['separationDistance'], 26),
  bound('perception', v['perception'], 70),
  bound('viewAngle', v['viewAngle'], 270),
  bound('maxSpeed', v['maxSpeed'], 150),
  bound('minSpeed', v['minSpeed'], 60),
  bound('maxForce', v['maxForce'], 220),
  bound('wander', v['wander'], 0.25),
  plain('edges', v['edges'], 'wrap'),
  bound('edgeMargin', v['edgeMargin'], 80),
  bound('boidSize', v['boidSize'], 7),
  plain('shape', v['shape'], 'dart'),
  bound('trails', v['trails'], 0),
  ...glowAttributes(v),
])}`,
    usageLanguage: 'html',
    height: 520,
  },
  {
    id: 'lit-surface',
    name: 'Lit surfaces',
    category: 'Light',
    summary: 'A card, a bar or a button over a background turns into glass and takes the background’s light.',
    api: '[lenziLit], LenziAmbientLight',
    entry: '@lenzi/ui-kit/backgrounds',
    origin: 'new in the kit, 2026-11-13 ("like the youtube backlight feature where elements get slightly alominated by it")',
    files: ['backgrounds/src/ambient-light/lit.ts', 'backgrounds/src/ambient-light/ambient-light.ts', 'backgrounds/src/ambient-light/lit.spec.ts', 'backgrounds/src/ambient-light/ambient-light.spec.ts', 'src/styles/global.css'],
    ...docs('backgrounds/src/ambient-light'),
    demo: () => import('./demos/lit-surface-demo/lit-surface-demo').then((m) => m.LitSurfaceDemo),
    controls: [
      { key: 'lit', label: 'Lit (lenziLit)', type: 'boolean', default: true, code: { match: /\slenziLit[\s>]/ } },
      {
        key: 'behind',
        label: 'Behind them',
        type: 'select',
        default: 'blobs',
        options: [
          { value: 'blobs', label: 'blobs' },
          { value: 'flock', label: 'a flock' },
          { value: 'picture', label: 'a picture (glass only: it sheds no light)' },
        ],
        code: false,
      },
      { key: 'glass', label: 'Lit surface opacity (%)', type: 'number', default: 46, min: 0, max: 100, step: 1, code: { match: /--lenzi-lit-glass:\s*(-?[\d.]+)%/ } },
      { key: 'veil', label: 'Light on the surface (%)', type: 'number', default: 34, min: 0, max: 100, step: 1, code: { match: /--lenzi-lit-veil:\s*(-?[\d.]+)%/ } },
      { key: 'rim', label: 'Light on the border (%)', type: 'number', default: 80, min: 0, max: 100, step: 1, code: { match: /--lenzi-lit-rim:\s*(-?[\d.]+)%/ } },
      { key: 'reduce', label: 'Reduce transparency', type: 'boolean', default: false, code: { match: /setReduceTransparency\(true\)/ } },
    ],
    usage: (v) => `<!-- import { LenziBlobBackground, LenziLit } from '@lenzi/ui-kit/backgrounds'; -->
<lenzi-blob-background />

<mat-card appearance="outlined"${v['lit'] ? ' lenziLit' : ''}>…</mat-card>
<button mat-stroked-button${v['lit'] ? ' lenziLit' : ''} type="button">Like</button>

<!-- How lit, for every surface: global variables (the Variables page saves them into the kit) -->
<style>
  :root {
    --lenzi-lit-glass: ${v['glass']}%;
    --lenzi-lit-veil: ${v['veil']}%;
    --lenzi-lit-rim: ${v['rim']}%;
  }
</style>

<!-- Reduce transparency makes them solid and unlit: LenziAppearance.setReduceTransparency(${v['reduce']}) -->`,
    usageLanguage: 'html',
    height: 480,
  },
  {
    id: 'glow',
    name: 'Glowing elements',
    category: 'Light',
    summary: 'Any element turned into a lamp: it glows in any colour and lights the lit elements around it, on the same plane.',
    api: '[lenziGlow], LenziLightField',
    entry: '@lenzi/ui-kit/backgrounds',
    origin: 'new in the kit, 2026-11-14 ("a lit surface and projects light directly onto the others component")',
    files: ['backgrounds/src/glow/glow.ts', 'backgrounds/src/glow/light-field.ts', 'backgrounds/src/glow/glow.spec.ts', 'backgrounds/src/glow/light-field.spec.ts', 'backgrounds/src/ambient-light/lit.ts', 'src/styles/global.css'],
    ...docs('backgrounds/src/glow'),
    demo: () => import('./demos/glow-demo/glow-demo').then((m) => m.GlowDemo),
    controls: [
      { key: 'lights', label: 'Every light on', type: 'boolean', default: true, code: false },
      { key: 'strength', label: 'Strength (0 to 2)', type: 'number', default: 1, min: 0, max: 2, step: 0.05, code: { match: /\[glowStrength\]="(-?[\d.]+)"/, otherwise: 1 } },
      { key: 'reach', label: 'Reach (px)', type: 'number', default: 220, min: 20, max: 600, step: 10, code: { match: /\[glowReach\]="(-?[\d.]+)"/, otherwise: 220 } },
      { key: 'veil', label: 'Lamp light on a surface (%)', type: 'number', default: 70, min: 0, max: 100, step: 1, code: { match: /--lenzi-glow-veil:\s*(-?[\d.]+)%/ } },
      { key: 'rim', label: 'Lamp light on a border (%)', type: 'number', default: 100, min: 0, max: 100, step: 1, code: { match: /--lenzi-glow-rim:\s*(-?[\d.]+)%/ } },
    ],
    usage: (v) => `<!-- import { LenziGlow, LenziLit } from '@lenzi/ui-kit/backgrounds'; -->

<!-- a lamp: it glows, and lights the lit elements around it (it is lit by the others too) -->
<button mat-fab lenziGlow glowColor="#ffb74d"${v['strength'] === 1 ? '' : ` [glowStrength]="${v['strength']}"`}${v['reach'] === 220 ? '' : ` [glowReach]="${v['reach']}"`} aria-label="Bulb">
  <mat-icon>lightbulb</mat-icon>
</button>

<!-- switched off, it is a lit surface like the others -->
<button mat-stroked-button [lenziGlow]="playing()" type="button">Play</button>

<!-- only lit -->
<mat-card appearance="outlined" lenziLit>…</mat-card>

<!-- How much light lies on the lit elements, for every lamp: global variables -->
<style>
  :root {
    --lenzi-glow-veil: ${v['veil']}%;
    --lenzi-glow-rim: ${v['rim']}%;
  }
</style>`,
    usageLanguage: 'html',
    height: 640,
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
      { key: 'animate', label: 'Turning', type: 'boolean', default: true, code: { absent: /\[animate\]="false"/ } },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.6, min: 0, max: 3, step: 0.1, code: { match: /delta \* ([\d.]+)\)/ } },
      { key: 'detail', label: 'Detail', type: 'number', default: 1, min: 0, max: 4, step: 1, code: { match: /IcosahedronGeometry\(1\.4, (\d+)\)/ } },
      { key: 'wireframe', label: 'Wireframe', type: 'boolean', default: false, code: { match: /wireframe: true/ } },
      {
        key: 'color',
        label: 'Colour',
        type: 'select',
        default: '--mat-sys-primary',
        options: ['--mat-sys-primary', '--mat-sys-tertiary', '--mat-sys-secondary', '--lenzi-status-good'].map((value) => ({ value, label: value })),
        code: { match: /color\('([^']+)'\)/ },
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

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What the usage code says a parameter is, or undefined when it says nothing usable. */
function readControl(control: Control, spec: Exclude<CodeSpec, false>, text: string, notes: string[]): Value | undefined {
  const otherwise = 'otherwise' in spec && spec.otherwise !== undefined ? spec.otherwise : control.type === 'boolean' ? false : control.default;
  const coerce = (raw: string): Value | undefined => {
    if (control.type === 'number') {
      const number = Number(raw);
      if (Number.isNaN(number)) return undefined;
      const clamped = Math.min(control.max ?? number, Math.max(control.min ?? number, number));
      if (clamped !== number) notes.push(`${control.label}: ${raw} is out of its range, ${clamped} used`);
      return clamped;
    }
    if (control.type === 'select' && control.options && !control.options.some((option) => option.value === raw)) {
      notes.push(`${control.label}: "${raw}" is not one of ${control.options.map((option) => option.value).join(', ')}`);
      return undefined;
    }
    return raw;
  };
  if ('absent' in spec) return !spec.absent.test(text);
  if ('all' in spec) {
    const found = [...text.matchAll(spec.all)].map((match) => match[1] ?? '');
    return found.length ? found.join(spec.join) : otherwise;
  }
  if ('nth' in spec) {
    const match = [...text.matchAll(spec.nth)][spec.index];
    return match ? coerce(match[1] ?? '') : otherwise;
  }
  if ('match' in spec) {
    const match = spec.match.exec(text);
    if (control.type === 'boolean') return match !== null;
    return match ? coerce(match[1] ?? '') : otherwise;
  }
  const name = escapeRegex(spec.attr);
  if (control.type === 'boolean') {
    const bound = new RegExp(`\\[${name}\\]="(true|false)"`).exec(text) ?? new RegExp(`(?<![\\w.-])${name}: (true|false)`).exec(text);
    if (bound) return bound[1] === 'true';
    return new RegExp(`(?<![\\w\\[.-])${name}(?=[\\s/>])(?!\\s*[=:])`).test(text) ? true : otherwise;
  }
  const patterns = [
    new RegExp(`(?<![\\w\\[.-])${name}="([^"]*)"`),
    new RegExp(`\\[${name}\\]="'([^']*)'"`),
    new RegExp(`\\[${name}\\]="(-?[\\d.]+)"`),
    new RegExp(`(?<![\\w.-])${name}: '([^']*)'`),
    new RegExp(`(?<![\\w.-])${name}: (-?[\\d.]+)`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return coerce(match[1] ?? '');
  }
  return otherwise;
}

/**
 * The parameters an edited usage code sets: what the GUI and the demo follow. Parameters the code
 * does not carry (`code: false`) are left out; `notes` says what could not be used.
 */
export function readUsage(doc: KitDoc, text: string): { values: Values; notes: string[] } {
  const values: Values = {};
  const notes: string[] = [];
  for (const control of doc.controls) {
    const spec = control.code ?? { attr: control.key };
    if (spec === false) continue;
    const value = readControl(control, spec, text, notes);
    if (value !== undefined) values[control.key] = value;
  }
  return { values, notes };
}

/** The parameters the usage code carries (the others only the GUI sets). */
export function codedControls(doc: KitDoc): Control[] {
  return doc.controls.filter((control) => control.code !== false);
}
