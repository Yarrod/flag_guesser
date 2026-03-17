import { useCallback, useEffect, useRef } from 'react';

type AudioMap = Map<string, HTMLAudioElement>;

function createAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'metadata';
  // Helps iOS keep media playback inline and less restrictive.
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  return audio;
}

async function unlockAudioElement(audio: HTMLAudioElement): Promise<boolean> {
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
    return true;
  } catch {
    return false;
  } finally {
    audio.muted = originalMuted;
  }
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
        // iOS can block the first playback if it is not recognized as unlocked.
        const unlocked = await unlockAudioElement(audio);
        if (!unlocked) {
          return;
        }

        isUnlockedRef.current = true;
        audio.currentTime = 0;
        await audio.play().catch(() => {
          // If retry fails, stay silent instead of throwing.
        });
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

        audio
          .play()
          .catch(async () => {
            const unlocked = await unlockAudioElement(audio);
            if (unlocked) {
              isUnlockedRef.current = true;
              audio.currentTime = 0;
              await audio.play().catch(() => {
                cleanup();
                resolve();
              });
              return;
            }

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

    const audios = [...audioMapRef.current.values()];
    if (audios.length === 0) {
      isUnlockedRef.current = true;
      return;
    }

    const first = audios[0];
    const unlocked = await unlockAudioElement(first);
    if (unlocked) {
      isUnlockedRef.current = true;
    }
  }, []);

  return { play, playAndWait, unlockAll, prepare };
}
