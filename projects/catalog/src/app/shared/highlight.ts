// Code colouring for the catalog (highlight.js, only the languages the kit is written in). A plain
// module (no schematic makes one). The colours are the theme's: styles.css, ".hljs-*".
import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import scss from 'highlight.js/lib/languages/scss';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

const ALIASES: Record<string, string> = { ts: 'typescript', html: 'xml', md: 'markdown', js: 'typescript', mjs: 'typescript', sh: 'markdown' };

/** The language of a file, from its name: "add-button.ts" → typescript. */
export function languageOf(path: string): string {
  const extension = path.split('.').pop() ?? '';
  return ALIASES[extension] ?? extension;
}

/** The code as coloured HTML (escaped by highlight.js); plain escaped text for a language it does not know. */
export function highlight(code: string, language: string): string {
  const name = ALIASES[language] ?? language;
  if (hljs.getLanguage(name)) return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
  return code.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}
