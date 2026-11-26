// The pages of the catalog: the one place that says which exist (lenzi, 2026-11-13: "Don't list them
// manually, use a code solution to know which pages are there / can be generated"). The routes are
// built from it (app.routes.ts: a page here without its component does not compile), the Admin page
// lists it, and the build writes it down for the server (tools/pages.mjs → dist/site-pages.json), which
// gives the public only what the public pages read. A new entry here, or a new piece in the registry,
// is everywhere by itself. A plain data module (no schematic makes one), with no imports: Node reads
// it as it is.

/** A page with a fixed address. */
export interface SiteEntry {
  /** Its address without the first "/". */
  path: string;
  title: string;
  /**
   * Always public, without a toggle: the catalog itself (lenzi, 2026-11-13: "Il catalogo deve sempre
   * rimanere pubblico, sono le altre pagine che dovrebbero rimanere nascoste con i contenuti"), and
   * the Admin page, where the admin signs in.
   */
  always?: boolean;
  /** A document of the kit the page shows (relative to projects/kit). */
  file?: string;
  /** What else it reads from the server: refused to the public while the page is hidden. */
  resources?: readonly string[];
}

export const SITE = [
  // the overview's tile of changes reads the history only while /history is shown (that page's data, served with it)
  { path: '', title: 'ui-kit', always: true },
  { path: 'components', title: 'Components', always: true },
  // the Scenes tab (2026-11-14): everyone makes scenes in the maker ("gli utenti devono finire lí!") and shares
  // them by a link, which shows the scene alone (a tab, an iframe)
  { path: 'scenes', title: 'Scenes', always: true },
  { path: 'scenes/maker', title: 'Scene maker', always: true },
  { path: 'scene', title: 'Scene', always: true },
  { path: 'rules', title: 'Rules', file: 'RULES.md' },
  { path: 'ai-rules', title: 'AI rules', file: 'AI-RULES.md' },
  { path: 'variables', title: 'Variables', resources: ['kit-src/src/styles/tokens.json'] },
  { path: 'libraries', title: 'Libraries', resources: ['kit-src/libraries.json'] },
  { path: 'history', title: 'History', resources: ['api/history'] },
  { path: 'admin', title: 'Admin', always: true },
] as const satisfies readonly SiteEntry[];

/** The address of a fixed page: the routes need a component for each. */
export type SitePath = (typeof SITE)[number]['path'];

/** One page of the catalog, as the Admin page and the server know it. */
export interface SitePage {
  /** Its address without the first "/": "", "rules", "components/add-button". */
  key: string;
  title: string;
  /** Always public, without a toggle. */
  always: boolean;
  /** What it reads from the server ("kit-src/RULES.md", "api/history"). */
  resources: string[];
}

/** What a page of a piece needs from the registry. */
interface Piece {
  id: string;
  name: string;
  files: readonly string[];
  readme: string;
  ai: string;
}

/** The address of a piece's page; its demo's frame belongs to it. */
export const componentKey = (id: string): string => `components/${id}`;

/** Every page there is: the fixed ones, and one per piece of the registry (always public: they are the catalog). */
export function sitePages(pieces: readonly Piece[]): SitePage[] {
  const fixed = (SITE as readonly SiteEntry[]).map((entry) => ({
    key: entry.path,
    title: entry.title,
    always: entry.always === true,
    resources: [...(entry.file ? [`kit-src/${entry.file}`] : []), ...(entry.resources ?? [])],
  }));
  const components = pieces.map((piece) => ({
    key: componentKey(piece.id),
    title: piece.name,
    always: true,
    resources: [...piece.files, piece.readme, piece.ai].map((file) => `kit-src/${file}`),
  }));
  return [...fixed, ...components];
}
