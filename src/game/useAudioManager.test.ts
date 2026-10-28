import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioManager } from './useAudioManager';

describe('useAudioManager', () => {
  let audio: HTMLAudioElement;

  beforeEach(() => {
    vi.useFakeTimers();
    audio = new Audio('/feedback.mp3');
    vi.spyOn(window, 'Audio').mockImplementation(function () {
      return audio;
    });
  });

  it.each(['ended', 'error', 'abort', 'pause'])(
    'finishes waiting on %s and removes the fallback timer',
    async (event) => {
      const { result } = renderHook(() => useAudioManager());
      const finished = vi.fn();
      const playback = result.current.playAndWait('/feedback.mp3').then(finished);

      expect(finished).not.toHaveBeenCalled();
      audio.dispatchEvent(new Event(event));
      await playback;

      expect(finished).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.each(['playing', 'pending'])('recovers when %s playback never ends', async (state) => {
    if (state === 'pending') {
      vi.spyOn(audio, 'play').mockImplementation(() => new Promise(() => {}));
    }
    const pause = vi.spyOn(audio, 'pause');
    const { result } = renderHook(() => useAudioManager());
    const finished = vi.fn();
    const playback = result.current.playAndWait('/feedback.mp3').then(finished);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999);
    });
    expect(finished).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await playback;
    });

    expect(finished).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes when the browser rejects playback', async () => {
    vi.spyOn(audio, 'play').mockRejectedValue(new Error('Playback blocked'));
    const { result } = renderHook(() => useAudioManager());

    await result.current.playAndWait('/feedback.mp3');

    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes when loading throws synchronously', async () => {
    Object.defineProperty(audio, 'readyState', { value: 0 });
    vi.spyOn(audio, 'load').mockImplementation(() => {
      throw new Error('Loading failed');
    });
    const { result } = renderHook(() => useAudioManager());

    await result.current.playAndWait('/feedback.mp3');

    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up pending playback when unmounted', async () => {
    const { result, unmount } = renderHook(() => useAudioManager());
    const playback = result.current.playAndWait('/feedback.mp3');

    unmount();
    await playback;

    expect(vi.getTimerCount()).toBe(0);
    expect(audio.src).toBe('');
  });
});
