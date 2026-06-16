import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class MockAudio extends EventTarget {
  preload = 'metadata';
  readyState = 1;
  currentTime = 0;
  muted = false;
  src: string;

  constructor(src = '') {
    super();
    this.src = src;
  }

  load() {
    this.readyState = 4;
  }

  pause() {}

  play() {
    return Promise.resolve();
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    writable: true,
    value: false
  });

  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    writable: true,
    value: null
  });

  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined)
  });

  Object.defineProperty(Element.prototype, 'requestFullscreen', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined)
  });

  Object.defineProperty(window, 'Audio', {
    configurable: true,
    writable: true,
    value: MockAudio
  });
});

afterEach(() => {
  cleanup();
  document.body.className = '';
  document.documentElement.removeAttribute('data-theme');
  vi.useRealTimers();
});
