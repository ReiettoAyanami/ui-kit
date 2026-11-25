import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { provideLenziKit } from '@lenzi/ui-kit';
import { provideLenziLiquidGlass } from '@lenzi/ui-kit/backgrounds';
import { lenziErrorInterceptor } from '@lenzi/ui-kit/http';

import { routes } from './app.routes';

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
  ],
};
