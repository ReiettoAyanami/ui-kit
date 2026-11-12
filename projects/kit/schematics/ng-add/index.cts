// `ng add @lenzi/ui-kit`: sets the kit up in an Angular app the way `ng add @angular/material` sets up
// Material. A schematic (Angular's own code generator), compiled on its own (tsconfig.schematics.json)
// next to the package. It changes three things, and says what it did:
// 1. package.json: the kit's peer dependencies that are missing (Material, the CDK, the fonts);
// 2. angular.json: the kit's styles and fonts first in the app's "styles";
// 3. app.config.ts: provideLenziKit({ appId }) and provideHttpClient with lenziErrorInterceptor.
import { Rule, SchematicContext, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import { DependencyType, addDependency, addRootProvider, readWorkspace, updateWorkspace } from '@schematics/angular/utility';

export interface NgAddOptions {
  project?: string;
  appId?: string;
}

/** The kit's look, first in an app's styles: the app's own come after it. */
export const LENZI_STYLES = ['node_modules/@lenzi/ui-kit/styles/kit.scss', 'node_modules/@lenzi/ui-kit/styles/fonts.css'];

/** What the kit needs next to it in every app (the charts' and three's are added by the app that uses them). */
const PEERS = ['@angular/cdk', '@angular/material', '@fontsource/roboto-mono', 'material-icons'];

/** The versions the kit asks for, from its own package.json (installed in the app's node_modules). */
function peerVersions(tree: Tree): Record<string, string> {
  const path = 'node_modules/@lenzi/ui-kit/package.json';
  const manifest = tree.exists(path) ? tree.readText(path) : null;
  const fallback: Record<string, string> = {
    '@angular/cdk': '^21.2.0',
    '@angular/material': '^21.2.0',
    '@fontsource/roboto-mono': '^5.3.0',
    'material-icons': '^1.13.14',
  };
  if (!manifest) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(manifest).peerDependencies ?? {}) };
  } catch {
    return fallback;
  }
}

/** Whether the app already depends on a package. */
function dependsOn(tree: Tree, name: string): boolean {
  const manifest = tree.exists('package.json') ? JSON.parse(tree.readText('package.json')) : {};
  return Boolean(manifest.dependencies?.[name] || manifest.devDependencies?.[name]);
}

type Style = string | { input: string };
const styleInput = (style: Style) => (typeof style === 'string' ? style : style.input);

export function ngAdd(options: NgAddOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await readWorkspace(tree);
    const applications = [...workspace.projects.keys()].filter((key) => workspace.projects.get(key)?.extensions['projectType'] === 'application');
    const name = options.project ?? applications[0];
    const project = name ? workspace.projects.get(name) : undefined;
    if (!name || !project || project.extensions['projectType'] !== 'application') {
      throw new SchematicsException(`@lenzi/ui-kit sets up an application: no application "${options.project ?? ''}" in this workspace.`);
    }
    const appId = options.appId ?? name;
    const versions = peerVersions(tree);
    const appConfig = `${project.sourceRoot ?? `${project.root}/src`}/app/app.config.ts`.replace(/^\/+/, '');
    const config = tree.exists(appConfig) ? tree.readText(appConfig) : '';
    const hasHttp = config.includes('provideHttpClient(');
    const hasKit = config.includes('provideLenziKit(');

    return chain([
      ...PEERS.filter((peer) => !dependsOn(tree, peer)).map((peer) => addDependency(peer, versions[peer] ?? 'latest', { type: DependencyType.Default })),
      updateWorkspace((workspace) => {
        const target = workspace.projects.get(name)?.targets.get('build');
        if (!target) throw new SchematicsException(`The application "${name}" has no build target.`);
        target.options ??= {};
        const styles = ((target.options['styles'] as Style[] | undefined) ?? []).filter((style) => !LENZI_STYLES.includes(styleInput(style)));
        target.options['styles'] = [...LENZI_STYLES, ...styles];
      }),
      // Run twice, it changes nothing the second time.
      hasKit
        ? (_tree: Tree, ctx: SchematicContext) => ctx.logger.info('provideLenziKit is there already.')
        : addRootProvider(name, ({ code, external }) => code`${external('provideLenziKit', '@lenzi/ui-kit')}({ appId: '${appId}' })`),
      hasHttp
        ? (_tree: Tree, ctx: SchematicContext) =>
            ctx.logger.warn(
              'provideHttpClient is there already: add lenziErrorInterceptor (from @lenzi/ui-kit/http) to its withInterceptors([...]).',
            )
        : addRootProvider(
            name,
            ({ code, external }) =>
              code`${external('provideHttpClient', '@angular/common/http')}(${external('withFetch', '@angular/common/http')}(), ${external('withInterceptors', '@angular/common/http')}([${external('lenziErrorInterceptor', '@lenzi/ui-kit/http')}]))`,
          ),
      (_tree: Tree, ctx: SchematicContext) => {
        ctx.logger.info(`@lenzi/ui-kit is set up in "${name}": its styles in angular.json, provideLenziKit({ appId: '${appId}' }) in its providers.`);
        ctx.logger.info('Next: put the pages in <lenzi-app-shell>, and read node_modules/@lenzi/ui-kit/AI-RULES.md and RULES.md.');
      },
    ]);
  };
}
