import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('style', () => {
  it('keeps hidden UI overlays truly hidden in the browser', () => {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

    expect(css).toContain('[hidden]');
    expect(css).toContain('display: none');
  });
});
