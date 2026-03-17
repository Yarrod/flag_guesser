import { useCallback, useEffect, useRef } from 'react';

type AudioMap = Map<string, HTMLAudioElement>;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  // Keep startup light, then browser can fetch more when playback happens.
  audio.preload = 'metadata';
  return audio;
}

export function useAudioManager(initialSources: string[] = []) {
  const audioMapRef = useRef<AudioMap>(new Map());
  const isUnlockedRef = useRef(false);

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
    return () => {
      const map = audioMapRef.current;
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
        // Silent fail: autoplay may be blocked until first user interaction
        // or audio files are missing/invalid.
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

      if (audio.readyState === 0) {
        audio.load();
      }

      audio.currentTime = 0;

      await new Promise<void>((resolve) => {
        const onEnded = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          resolve();
        };

        const cleanup = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        audio.play().catch(() => {
          cleanup();
          resolve();
        });
      });
    },
    [getAudio]
  );

  const unlockAll = useCallback(async () => {
    if (isUnlockedRef.current) {
      return;
    }
    isUnlockedRef.current = true;

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
          // If this fails, normal playback may still work for some clips.
        } finally {
          audio.muted = originalMuted;
        }
      })
    );
  }, []);

  return { play, playAndWait, unlockAll, prepare };
}
