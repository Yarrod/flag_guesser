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
