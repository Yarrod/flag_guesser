import { useCallback, useEffect, useRef } from 'react';

type AudioMap = Map<string, HTMLAudioElement>;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.load();
  return audio;
}

export function useAudioManager(sources: string[]) {
  const audioMapRef = useRef<AudioMap>(new Map());
  const isUnlockedRef = useRef(false);

  useEffect(() => {
    const uniqueSources = [...new Set(sources)];
    const map = audioMapRef.current;

    uniqueSources.forEach((src) => {
      if (!map.has(src)) {
        map.set(src, createAudio(src));
      }
    });

    return () => {
      map.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      map.clear();
    };
  }, [sources]);

  const getAudio = useCallback((src: string) => {
    const map = audioMapRef.current;
    if (!map.has(src)) {
      map.set(src, createAudio(src));
    }
    return map.get(src) ?? null;
  }, []);

  const play = useCallback(
    async (src: string) => {
      const audio = getAudio(src);
      if (!audio) {
        return;
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

  return { play, playAndWait, unlockAll };
}
