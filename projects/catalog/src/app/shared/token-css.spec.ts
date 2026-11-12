import { TokenDef } from './tokens-api';
import { invalidReason, readTokenCss, tokensToCss } from './token-css';

const glass: TokenDef = { name: '--lenzi-glass', label: 'Window opacity', type: 'percent', value: '56%', min: 0, max: 100, description: '', why: '' };
const border: TokenDef = { name: '--lenzi-border', label: 'Border width', type: 'length', value: '2px', min: 1, max: 4, description: '', why: '' };
const good: TokenDef = { name: '--lenzi-status-good', label: 'Good', type: 'color', value: '#6ed889', description: '', why: '' };

describe('the variables as CSS', () => {
  it('checks a value the way the server does', () => {
    expect(invalidReason(glass, '60%')).toBeNull();
    expect(invalidReason(glass, '101%')).toBe('above 100');
    expect(invalidReason(border, '2em')).toBe('not a length value');
    expect(invalidReason(good, '#ffffff')).toBeNull();
    expect(invalidReason(border, '2px; } body {')).toBe('not a length value');
  });

  it('writes a :root block and reads it back, comments aside', () => {
    const css = tokensToCss([{ label: 'Glass', tokens: [glass] }, { label: 'Borders', tokens: [border] }], (token) => token.value);
    expect(css).toContain('  /* Glass */');
    expect(css).toContain('  --lenzi-glass: 56%; /* Window opacity */');
    expect(readTokenCss(css, [glass, border])).toEqual({ values: { '--lenzi-glass': '56%', '--lenzi-border': '2px' }, errors: [] });
  });

  it('says what is wrong and keeps what is right', () => {
    const reading = readTokenCss(':root { --lenzi-glass: 40%; --lenzi-border: 9px; --lenzi-nope: 1px; }', [glass, border]);
    expect(reading.values).toEqual({ '--lenzi-glass': '40%' });
    expect(reading.errors).toEqual(['--lenzi-border: above 4', '--lenzi-nope: not a variable here']);
  });
});
