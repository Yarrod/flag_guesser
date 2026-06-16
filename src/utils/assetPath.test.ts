import { describe, expect, it } from 'vitest';
import { resolveAssetPath } from './assetPath';

describe('resolveAssetPath', () => {
  it('keeps absolute http urls untouched', () => {
    expect(resolveAssetPath('https://example.com/flags/cz.png')).toBe('https://example.com/flags/cz.png');
  });

  it('prefixes root-relative assets with the configured base url', () => {
    expect(resolveAssetPath('/flags/cz.png')).toBe(`${import.meta.env.BASE_URL}flags/cz.png`);
  });

  it('prefixes relative assets with the configured base url', () => {
    expect(resolveAssetPath('flags/cz.png')).toBe(`${import.meta.env.BASE_URL}flags/cz.png`);
  });
});
