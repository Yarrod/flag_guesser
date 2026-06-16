import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { FEEDBACK_AUDIO, FLAGS } from './data/flags';
import type { Round } from './game/types';
import { resolveAssetPath } from './utils/assetPath';

const roundMocks = vi.hoisted(() => ({
  generateRound: vi.fn()
}));

const audioManagerMocks = vi.hoisted(() => ({
  play: vi.fn(),
  playAndWait: vi.fn(),
  unlockAll: vi.fn(),
  prepare: vi.fn()
}));

vi.mock('./game/rounds', () => ({
  generateRound: roundMocks.generateRound
}));

vi.mock('./game/useAudioManager', () => ({
  useAudioManager: () => audioManagerMocks
}));

function getFlag(id: string) {
  const flag = FLAGS.find((item) => item.id === id);
  if (!flag) {
    throw new Error(`Missing fixture flag: ${id}`);
  }
  return flag;
}

function queueRounds(...rounds: Round[]) {
  roundMocks.generateRound.mockReset();
  rounds.forEach((round) => {
    roundMocks.generateRound.mockReturnValueOnce({
      round,
      nextHistory: [round.correct.id]
    });
  });
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function startEnglishGame(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'English' }));
  await user.click(screen.getByRole('button', { name: '3' }));
}

describe('App', () => {
  const france = getFlag('fr');
  const germany = getFlag('de');
  const italy = getFlag('it');
  const spain = getFlag('es');
  const portugal = getFlag('pt');
  const belgium = getFlag('be');
  const austria = getFlag('at');
  const netherlands = getFlag('nl');
  const sweden = getFlag('se');
  const poland = getFlag('pl');
  const norway = getFlag('no');
  const denmark = getFlag('dk');

  const firstRound: Round = {
    correct: france,
    choices: [france, germany, italy]
  };

  const secondRound: Round = {
    correct: spain,
    choices: [spain, portugal, belgium]
  };

  const compactRound: Round = {
    correct: france,
    choices: [france, germany, italy, austria, netherlands, sweden]
  };

  const denseRound: Round = {
    correct: france,
    choices: [france, germany, italy, austria, netherlands, sweden, poland, norway, denmark]
  };

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (jsdom)'
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0
    });
    audioManagerMocks.play.mockReset().mockResolvedValue(undefined);
    audioManagerMocks.playAndWait.mockReset().mockResolvedValue(undefined);
    audioManagerMocks.unlockAll.mockReset().mockResolvedValue(undefined);
    audioManagerMocks.prepare.mockReset();
    roundMocks.generateRound.mockReset();
  });

  it('starts a game from the menu and plays the current country prompt', async () => {
    queueRounds(firstRound);
    const user = userEvent.setup();

    render(<App />);
    await startEnglishGame(user);

    expect(screen.getByRole('button', { name: 'Replay name' })).toBeInTheDocument();
    expect(screen.getByText('Round: 1')).toBeInTheDocument();
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flag: France' })).toBeInTheDocument();

    await waitFor(() => {
      expect(audioManagerMocks.play).toHaveBeenCalledWith(resolveAssetPath(france.audioPathEn));
    });
  });

  it('syncs the app height css variable on render and resize', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 812
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1080
    });

    render(<App />);

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('812px');
    expect(document.documentElement.style.getPropertyValue('--app-width')).toBe('1080px');
    expect(document.documentElement.style.getPropertyValue('--app-top')).toBe('0px');
    expect(document.documentElement.style.getPropertyValue('--app-left')).toBe('0px');

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 430
    });

    fireEvent(window, new Event('resize'));

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('430px');
  });

  it('toggles pseudo fullscreen mode when the fullscreen api is unavailable', async () => {
    queueRounds(firstRound);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await startEnglishGame(user);

    await user.click(screen.getByRole('button', { name: 'Maximize' }));

    expect(document.body).toHaveClass('app-maximized');
    expect(container.querySelector('.game-shell')).toHaveClass('is-maximized');
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Minimize' }));

    expect(document.body).not.toHaveClass('app-maximized');
    expect(container.querySelector('.game-shell')).not.toHaveClass('is-maximized');
  });

  it('uses pseudo fullscreen on iPad Chrome even when native fullscreen appears available', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5
    });
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      writable: true,
      value: true
    });
    const requestFullscreen = vi.spyOn(Element.prototype, 'requestFullscreen');

    queueRounds(firstRound);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await startEnglishGame(user);
    await user.click(screen.getByRole('button', { name: 'Maximize' }));

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(document.body).toHaveClass('app-maximized');
    expect(container.querySelector('.game-shell')).toHaveClass('is-maximized');
  });

  it('uses the compact mobile grid class for six-choice rounds', async () => {
    queueRounds(compactRound);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: '6' }));

    expect(container.querySelector('.choices-grid')).toHaveClass('choices-grid--mobile-compact');
    expect(screen.getAllByRole('button', { name: /^Flag:/ })).toHaveLength(6);
  });

  it('uses the dense mobile grid class for nine-choice rounds', async () => {
    queueRounds(denseRound);
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: '9' }));

    expect(container.querySelector('.choices-grid')).toHaveClass('choices-grid--mobile-dense');
    expect(screen.getAllByRole('button', { name: /^Flag:/ })).toHaveLength(9);
  });

  it('increments the score and advances after a correct answer', async () => {
    vi.useFakeTimers();
    queueRounds(firstRound, secondRound);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flag: France' }));

    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('Score: 1')).toBeInTheDocument();
    expect(audioManagerMocks.playAndWait).toHaveBeenCalledWith(resolveAssetPath(FEEDBACK_AUDIO.en.correct));

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1700);
    });

    expect(screen.getByText('Round: 2')).toBeInTheDocument();
  });

  it('shows wrong-answer feedback and advances after the audio sequence finishes', async () => {
    const wrongAudio = createDeferred();
    const selectedPrompt = createDeferred();
    const selectedCountry = createDeferred();
    const pendingCalls = [wrongAudio, selectedPrompt, selectedCountry];
    queueRounds(firstRound, secondRound);
    audioManagerMocks.playAndWait.mockReset().mockImplementation(() => {
      const next = pendingCalls.shift();
      if (!next) {
        return Promise.resolve();
      }
      return next.promise;
    });

    const user = userEvent.setup();
    render(<App />);
    await startEnglishGame(user);
    await user.click(screen.getByRole('button', { name: 'Flag: Germany' }));

    expect(screen.getByText('Wrong. You selected Germany.')).toBeInTheDocument();
    expect(screen.getByText('The correct answer is France.')).toBeInTheDocument();
    expect(audioManagerMocks.playAndWait).toHaveBeenNthCalledWith(1, resolveAssetPath(FEEDBACK_AUDIO.en.wrong));

    wrongAudio.resolve();
    await waitFor(() => {
      expect(audioManagerMocks.playAndWait).toHaveBeenCalledTimes(2);
    });
    expect(audioManagerMocks.playAndWait).toHaveBeenNthCalledWith(2, resolveAssetPath(FEEDBACK_AUDIO.en.selected));

    selectedPrompt.resolve();
    await waitFor(() => {
      expect(audioManagerMocks.playAndWait).toHaveBeenCalledTimes(3);
    });
    expect(audioManagerMocks.playAndWait).toHaveBeenNthCalledWith(3, resolveAssetPath(germany.audioPathEn));

    selectedCountry.resolve();

    await waitFor(() => {
      expect(screen.getByText('Round: 2')).toBeInTheDocument();
    });
  });
});
