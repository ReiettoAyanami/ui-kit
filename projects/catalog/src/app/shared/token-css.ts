// The global variables as CSS text, and back: what the Variables editors show and read. The rules
// for a value are the server's (server/tokens.mjs, invalidReason): a value is checked here as it is
// typed, and again by the server when it is saved. A plain module (no schematic makes one).
import { TokenDef, TokenGroup } from './tokens-api';

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;

const FORMATS: Record<Exclude<TokenDef['type'], 'choice'>, { pattern: RegExp; ranged: boolean }> = {
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

/** Why a value cannot be one of this variable's, or null when it can (the server's rule). */
export function invalidReason(token: Pick<TokenDef, 'type' | 'min' | 'max' | 'options'>, value: string): string | null {
  // a choice: one of its own words
  if (token.type === 'choice') {
    const words = (token.options ?? []).map((option) => option.value);
    return words.includes(value.trim()) ? null : `not one of ${words.join(', ')}`;
  }
  const format = FORMATS[token.type];
  const match = format.pattern.exec(value.trim());
  if (!match) return `not a ${token.type} value`;
  if (format.ranged && match[1] !== undefined) {
    const number = Number(match[1]);
    if (token.min !== undefined && number < token.min) return `below ${token.min}`;
    if (token.max !== undefined && number > token.max) return `above ${token.max}`;
  }
  return null;
}

/** The variables as a :root block, one per line with its name as a comment; groups as comments. */
export function tokensToCss(groups: readonly Pick<TokenGroup, 'label' | 'tokens'>[], valueOf: (token: TokenDef) => string): string {
  const lines = [':root {'];
  groups.forEach((group, index) => {
    if (groups.length > 1) {
      if (index > 0) lines.push('');
      lines.push(`  /* ${group.label} */`);
    }
    for (const token of group.tokens) lines.push(`  ${token.name}: ${valueOf(token)}; /* ${token.label} */`);
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}

/** What a piece of CSS sets: every `--name: value;`, comments and anything else left out. */
export function readCss(text: string): Map<string, string> {
  const values = new Map<string, string>();
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+?)\s*;/gi)) values.set(match[1]!, match[2]!.trim());
  return values;
}

export interface CssReading {
  /** The variables the text sets to a valid value: name → value. */
  values: Record<string, string>;
  /** What is wrong, one line each: "--lenzi-border: below 1". */
  errors: string[];
}

/** The text's variables checked against the known ones: unknown names and wrong values are errors. */
export function readTokenCss(text: string, tokens: readonly TokenDef[]): CssReading {
  const known = new Map(tokens.map((token) => [token.name, token]));
  const values: Record<string, string> = {};
  const errors: string[] = [];
  for (const [name, value] of readCss(text)) {
    const token = known.get(name);
    if (!token) {
      errors.push(`${name}: not a variable here`);
      continue;
    }
    const reason = invalidReason(token, value);
    if (reason) errors.push(`${name}: ${reason}`);
    else values[name] = value;
  }
  return { values, errors };
}
