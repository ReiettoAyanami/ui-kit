/*
 * @lenzi/ui-kit: the public surface of the main entry point.
 * Charts: @lenzi/ui-kit/charts. three.js: @lenzi/ui-kit/three. HTTP errors: @lenzi/ui-kit/http.
 * Styles: styles/kit.scss (the look) and styles/fonts.css (bundled fonts and icons).
 * Rules: RULES.md (the look) and AI-RULES.md (how Claude works with the kit), next to this package.
 */

// Setup
export * from './lib/provide-kit';
export * from './lib/appearance/appearance';

// Layout
export * from './lib/app-shell/app-shell';
export * from './lib/nav-list/nav-list';
export * from './lib/not-found/not-found';
export * from './lib/version-label/version-label';

// Actions and inputs
export * from './lib/add-button/add-button';
export * from './lib/pill-toggle/pill-toggle';
export * from './lib/search-bar/search-bar';
export * from './lib/period-picker/period-picker';
export * from './lib/color-picker/color';
export * from './lib/color-picker/color-picker';
export * from './lib/card-menu/card-menu';
export * from './lib/preview-card/preview-card';

// Showing data
export * from './lib/figure/figure';
export * from './lib/figure/figure-grid';
export * from './lib/delta/delta';
export * from './lib/identity-dot/identity-color';
export * from './lib/identity-dot/identity-color-pipe';
export * from './lib/identity-dot/identity-dot';
export * from './lib/segmented-bar/segmented-bar';
export * from './lib/data-table/data-table';
export * from './lib/schedule-grid/schedule-grid';
export * from './lib/widget-card/widget-card';

// Feedback
export * from './lib/status-message/status-message';
export * from './lib/info-bar/info-bar';
export * from './lib/blocking-screen/blocking-screen';
export * from './lib/pull-to-refresh/pull-to-refresh';
export * from './lib/notification-bell/notification-bell';

// Dialogs
export * from './lib/dialogs/dialogs';
export * from './lib/confirm-dialog/confirm-dialog';

// Utilities
export * from './lib/util/preferences';
export * from './lib/util/kept-value';
export * from './lib/util/describe-error';
export * from './lib/util/phone';
