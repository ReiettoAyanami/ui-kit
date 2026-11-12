// The kit's global variables: tokens.json is the source, tokens.css is generated from it.
// `npm run tokens` regenerates the CSS; the catalog's dev server (tools/kit-server.mjs) uses the
// same functions to save what the Variables page changed. A plain Node module, no dependencies.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Where the tokens live in this workspace. */
export const STYLES_DIR = join(here, '..', 'projects', 'kit', 'src', 'styles');
export const TOKENS_JSON = join(STYLES_DIR, 'tokens.json');
export const TOKENS_CSS = join(STYLES_DIR, 'tokens.css');

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;

/** What a value of each type looks like, and its unit (for the range check). */
const FORMATS = {
  percent: { pattern: new RegExp(`^(${NUMBER})%$`), ranged: true },
  length: { pattern: new RegExp(`^(${NUMBER})px$`), ranged: true },
  time: { pattern: new RegExp(`^(${NUMBER})ms$`), ranged: true },
  number: { pattern: new RegExp(`^(${NUMBER})$`), ranged: true },
  color: { pattern: /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, ranged: false },
  easing: {
    pattern: new RegExp(
      `^(?:linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\))$`,
    ),
    ranged: false,
  },
};

/**
 * Why a value cannot be saved for this token, or null when it can. Values end up in a CSS file:
 * only the shapes above are accepted, so nothing else (a `;`, a `}`) can reach it.
 */
export function invalidReason(token, value) {
  if (typeof value !== 'string') return 'not a string';
  const format = FORMATS[token.type];
  if (!format) return `unknown type ${token.type}`;
  const match = format.pattern.exec(value.trim());
  if (!match) return `not a ${token.type} value`;
  if (format.ranged && match[1] !== undefined) {
    const number = Number(match[1]);
    if (token.min !== undefined && number < token.min) return `below ${token.min}`;
    if (token.max !== undefined && number > token.max) return `above ${token.max}`;
  }
  return null;
}

/** Every token, flat, by name. */
export function tokensByName(document) {
  const all = new Map();
  for (const group of document.groups) for (const token of group.tokens) all.set(token.name, token);
  return all;
}

/**
 * The document with the new values, or the list of what is wrong (nothing is changed then).
 * `values`: { "--kit-glass": "60%", ... }; names it does not know are refused.
 */
export function applyValues(document, values) {
  const known = tokensByName(document);
  const errors = [];
  for (const [name, value] of Object.entries(values)) {
    const token = known.get(name);
    if (!token) {
      errors.push({ name, reason: 'unknown variable' });
      continue;
    }
    const reason = invalidReason(token, value);
    if (reason) errors.push({ name, reason });
  }
  if (errors.length > 0) return { errors };
  const next = structuredClone(document);
  for (const group of next.groups) {
    for (const token of group.tokens) {
      if (Object.hasOwn(values, token.name)) token.value = values[token.name].trim();
    }
  }
  return { document: next };
}

/** The CSS of the document: one :root block, one comment per group. */
export function renderCss(document) {
  const lines = [
    '/* Generated from tokens.json by tools/tokens.mjs. Edit tokens.json, or the Variables page of the',
    '   catalog, never this file: it is written again from them. */',
    ':root {',
  ];
  document.groups.forEach((group, index) => {
    if (index > 0) lines.push('');
    lines.push(`  /* ${group.label} */`);
    for (const token of group.tokens) lines.push(`  ${token.name}: ${token.value};`);
  });
  lines.push('}', '');
  return lines.join('\n');
}

export async function readTokens(path = TOKENS_JSON) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/** Writes the document and the CSS made from it. */
export async function writeTokens(document, jsonPath = TOKENS_JSON, cssPath = TOKENS_CSS) {
  await writeFile(jsonPath, `${JSON.stringify(document, null, 2)}\n`);
  await writeFile(cssPath, renderCss(document));
}

// `node tools/tokens.mjs`: tokens.css again from tokens.json.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const document = await readTokens();
  await writeFile(TOKENS_CSS, renderCss(document));
  console.log(`tokens.css written: ${tokensByName(document).size} variables`);
}
