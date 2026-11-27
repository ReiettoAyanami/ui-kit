import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { provideLenziKit } from '@lenzi/ui-kit';
import { LenziGlassLanding, provideLenziGlassLanding, provideLenziLiquidGlass } from '@lenzi/ui-kit/backgrounds';
import { lenziErrorInterceptor } from '@lenzi/ui-kit/http';

import { routes } from './app.routes';

/**
 * Where the moving lenses land, by the port the catalog is served on (lenzi, 2026-11-27: "Su 4310 mettimi un esempio con
 * le liquid al landing, sul 4320 una con solido al landing, ma fallo scuro e non bianco al landing"): two copies of the
 * catalog side by side, `npx ng serve catalog --port 4310` and `--port 4320`. Elsewhere the kit's own (milky).
 */
const LANDING_BY_PORT: Record<string, Partial<LenziGlassLanding>> = {
  '4310': { material: 'liquid' },
  '4320': { material: 'solid', tone: 'dark' },
};
const landing = typeof location === 'undefined' ? undefined : LANDING_BY_PORT[location.port];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Route parameters and data arrive as component inputs (a component page's `id`).
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([lenziErrorInterceptor])),
    provideLenziKit({ appId: 'kit-catalog' }),
    // The catalog's floating layer is Liquid Glass (lenzi, 2026-11-25: "nel kit l'interfaccia va convertita con i nuovi
    // componenti liquidglass"): the top bar, menus, selects, windows, the "+" (Apple: the layer of controls, not the
    // content).
    provideLenziLiquidGlass(),
    ...(landing ? [provideLenziGlassLanding(landing)] : []),
  ],
};
