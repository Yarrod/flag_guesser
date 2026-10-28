import { useCallback, useEffect, useRef } from 'react';

type AudioMap = Map<string, HTMLAudioElement>;

// A stalled download or playback must not keep the game's answer controls locked.
const PLAYBACK_TIMEOUT_MS = 10_000;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'metadata';
  return audio;
}

export function useAudioManager(initialSources: string[] = []) {
  const audioMapRef = useRef<AudioMap>(new Map());
  const pendingPlaybackRef = useRef(new Set<() => void>());

  const getAudio = useCallback((src: string) => {
    const map = audioMapRef.current;
    if (!map.has(src)) {
      map.set(src, createAudio(src));
    }
    return map.get(src) ?? null;
  }, []);

  const prepare = useCallback(
    (sources: string[]) => {
      const uniqueSources = [...new Set(sources)];
      uniqueSources.forEach((src) => {
        if (!src) {
          return;
        }

        const audio = getAudio(src);
        if (!audio) {
          return;
        }

        if (audio.preload !== 'auto') {
          audio.preload = 'auto';
        }

        if (audio.readyState === 0) {
          audio.load();
        }
      });
    },
    [getAudio]
  );

  useEffect(() => {
    prepare(initialSources);
  }, [initialSources, prepare]);

  useEffect(() => {
    const map = audioMapRef.current;
    const pendingPlayback = pendingPlaybackRef.current;

    return () => {
      pendingPlayback.forEach((finish) => finish());
      map.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      map.clear();
    };
  }, []);

  const play = useCallback(
    async (src: string) => {
      const audio = getAudio(src);
      if (!audio) {
        return;
      }

      if (audio.readyState === 0) {
        audio.load();
      }

      audio.currentTime = 0;
      try {
        await audio.play();
      } catch {
        // Silent fail: playback can be blocked by browser policy or missing files.
      }
    },
    [getAudio]
  );

  const playAndWait = useCallback(
    async (src: string) => {
      const audio = getAudio(src);
      if (!audio) {
        return;
      }

      await new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timeout);
          audio.removeEventListener('ended', finish);
          audio.removeEventListener('error', finish);
          audio.removeEventListener('abort', finish);
          audio.removeEventListener('pause', finish);
          pendingPlaybackRef.current.delete(finish);
          resolve();
        };

        const timeout = window.setTimeout(() => {
          finish();
          audio.pause();
        }, PLAYBACK_TIMEOUT_MS);

        audio.addEventListener('ended', finish);
        audio.addEventListener('error', finish);
        audio.addEventListener('abort', finish);
        audio.addEventListener('pause', finish);
        pendingPlaybackRef.current.add(finish);

        try {
          if (audio.readyState === 0) {
            audio.load();
          }
          audio.currentTime = 0;
          void audio.play().catch(finish);
        } catch {
          finish();
        }
      });
    },
    [getAudio]
  );

  const unlockAll = useCallback(async () => {
    const audios = [...audioMapRef.current.values()];
    await Promise.all(
      audios.map(async (audio) => {
        const originalMuted = audio.muted;
        try {
          audio.muted = true;
          if (audio.readyState === 0) {
            audio.load();
          }
          audio.currentTime = 0;
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // Keep silent on failure.
        } finally {
          audio.muted = originalMuted;
        }
      })
    );
  }, []);

  return { play, playAndWait, unlockAll, prepare };
}
