// What every app of the kit provides once, in app.config.ts: `providers: [provideLenziKit(), ...]`.
// A plain module (no schematic makes a providers function).
import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';

import { LENZI_APP_ID, LenziAppearance } from './appearance/appearance';

export interface LenziKitOptions {
  /** The name the browser preferences are kept under (LENZI_APP_ID); 'kit' when not given. */
  appId?: string;
}

/**
 * The kit's app-wide settings:
 * - windows open and close a little slower than Material's 150 / 75 ms (lenzi, 2026-10-02: "poco
 *   più lente"): content fades in over 250 ms, the window fades out in 150 (global.css);
 * - the look this browser chose (Reduce transparency) applies from the first page.
 */
export function provideLenziKit(options: LenziKitOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...(options.appId ? [{ provide: LENZI_APP_ID, useValue: options.appId }] : []),
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { ...new MatDialogConfig(), enterAnimationDuration: '250ms', exitAnimationDuration: '150ms' },
    },
    provideEnvironmentInitializer(() => {
      inject(LenziAppearance);
    }),
  ]);
}
