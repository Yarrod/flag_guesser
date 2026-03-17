import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FlagCard } from './components/FlagCard';
import { ReplayButton } from './components/ReplayButton';
import { ScoreBoard } from './components/ScoreBoard';
import { FEEDBACK_AUDIO, FLAGS } from './data/flags';
import { generateRound } from './game/rounds';
import type { Round } from './game/types';
import { useAudioManager } from './game/useAudioManager';
import { resolveAssetPath } from './utils/assetPath';

type AnswerState = {
  selectedId: string | null;
  wasCorrect: boolean | null;
};

type Theme = 'light' | 'dark';
type Language = 'cs' | 'en';

type GridOption = {
  id: string;
  choices: number;
  columns: number;
};

type Translation = {
  title: string;
  chooseGrid: string;
  chooseLanguage: string;
  replay: string;
  backToMenu: string;
  correct: string;
  wrong: string;
  wrongSelectedPrefix: string;
  correctAnswerPrefix: string;
  selectedBadge: string;
  correctBadge: string;
  languageCs: string;
  languageEn: string;
  themeLight: string;
  themeDark: string;
  controls: string;
  choiceArea: string;
  scoreLabel: string;
  roundLabel: string;
  flagCardAriaPrefix: string;
};

const NEXT_ROUND_DELAY_CORRECT_MS = 1700;
const GRID_OPTIONS: GridOption[] = [
  { id: '3', choices: 3, columns: 3 },
  { id: '6', choices: 6, columns: 3 },
  { id: '9', choices: 9, columns: 3 }
];

const TRANSLATIONS: Record<Language, Translation> = {
  cs: {
    title: 'Hádej vlajku',
    chooseGrid: 'Vyber velikost mřížky',
    chooseLanguage: 'Vyber jazyk',
    replay: 'Znovu přehrát',
    backToMenu: 'Zpět do menu',
    correct: 'Správně!',
    wrong: 'Špatně!',
    wrongSelectedPrefix: 'Špatně. Vybral jsi zemi, která se jmenuje',
    correctAnswerPrefix: 'Správná odpověď je',
    selectedBadge: 'Tvůj výběr',
    correctBadge: 'Správně',
    languageCs: 'Čeština',
    languageEn: 'English',
    themeLight: 'Světlý režim',
    themeDark: 'Tmavý režim',
    controls: 'Ovládání zvuku',
    choiceArea: 'Výběr vlajky',
    scoreLabel: 'Body',
    roundLabel: 'Kolo',
    flagCardAriaPrefix: 'Vlajka'
  },
  en: {
    title: 'Guess the Flag',
    chooseGrid: 'Choose grid size',
    chooseLanguage: 'Choose language',
    replay: 'Replay name',
    backToMenu: 'Back to menu',
    correct: 'Correct!',
    wrong: 'Wrong!',
    wrongSelectedPrefix: 'Wrong. You selected',
    correctAnswerPrefix: 'The correct answer is',
    selectedBadge: 'Your choice',
    correctBadge: 'Correct',
    languageCs: 'Czech',
    languageEn: 'English',
    themeLight: 'Light mode',
    themeDark: 'Dark mode',
    controls: 'Audio controls',
    choiceArea: 'Flag choices',
    scoreLabel: 'Score',
    roundLabel: 'Round',
    flagCardAriaPrefix: 'Flag'
  }
};

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [isInMenu, setIsInMenu] = useState(true);
  const [language, setLanguage] = useState<Language>('cs');
  const [theme, setTheme] = useState<Theme>(getSystemTheme);
  const [activeGrid, setActiveGrid] = useState<GridOption | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [recentCorrectHistory, setRecentCorrectHistory] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>({ selectedId: null, wasCorrect: null });

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const nextRoundTimer = useRef<number | null>(null);

  const allAudioSources = useMemo(
    () => [
      ...FLAGS.map((item) => resolveAssetPath(item.audioPath)),
      ...FLAGS.map((item) => resolveAssetPath(item.audioPathEn)),
      resolveAssetPath(FEEDBACK_AUDIO.cs.correct),
      resolveAssetPath(FEEDBACK_AUDIO.cs.wrong),
      resolveAssetPath(FEEDBACK_AUDIO.cs.selected),
      resolveAssetPath(FEEDBACK_AUDIO.en.correct),
      resolveAssetPath(FEEDBACK_AUDIO.en.wrong),
      resolveAssetPath(FEEDBACK_AUDIO.en.selected)
    ],
    []
  );
  const { play, playAndWait } = useAudioManager(allAudioSources);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const clearNextRoundTimer = useCallback(() => {
    if (nextRoundTimer.current) {
      window.clearTimeout(nextRoundTimer.current);
      nextRoundTimer.current = null;
    }
  }, []);

  const getCountryAudio = useCallback(
    (flagId: string) => {
      const flag = FLAGS.find((item) => item.id === flagId);
      if (!flag) {
        return '';
      }
      return resolveAssetPath(language === 'cs' ? flag.audioPath : flag.audioPathEn);
    },
    [language]
  );

  const getCountryName = useCallback(
    (flagId: string) => {
      const flag = FLAGS.find((item) => item.id === flagId);
      if (!flag) {
        return '';
      }
      return language === 'cs' ? flag.czechName : flag.englishName;
    },
    [language]
  );

  const startRoundWithGrid = useCallback(
    (grid: GridOption, history: string[]) => {
      const next = generateRound(FLAGS, history, grid.choices);
      setRound(next.round);
      setRecentCorrectHistory(next.nextHistory);
      setFocusedIndex(0);
      setAnswerState({ selectedId: null, wasCorrect: null });
    },
    []
  );

  const startGame = useCallback(
    (grid: GridOption) => {
      clearNextRoundTimer();
      setActiveGrid(grid);
      setRoundNumber(1);
      setScore(0);
      setIsInMenu(false);
      startRoundWithGrid(grid, []);
    },
    [clearNextRoundTimer, startRoundWithGrid]
  );

  const backToMenu = useCallback(() => {
    clearNextRoundTimer();
    setIsInMenu(true);
    setActiveGrid(null);
    setRound(null);
    setRecentCorrectHistory([]);
    setRoundNumber(1);
    setScore(0);
    setFocusedIndex(0);
    setAnswerState({ selectedId: null, wasCorrect: null });
  }, [clearNextRoundTimer]);

  const playCurrentCountryName = useCallback(() => {
    if (!round) {
      return;
    }

    const audio = getCountryAudio(round.correct.id);
    if (!audio) {
      return;
    }
    void play(audio);
  }, [getCountryAudio, play, round]);

  const startNextRound = useCallback(() => {
    if (!activeGrid) {
      return;
    }

    startRoundWithGrid(activeGrid, recentCorrectHistory);
    setRoundNumber((value) => value + 1);
  }, [activeGrid, recentCorrectHistory, startRoundWithGrid]);

  useEffect(() => {
    if (!isInMenu && round) {
      void playCurrentCountryName();
    }
  }, [isInMenu, playCurrentCountryName, round, language]);

  useEffect(() => {
    if (isInMenu || !round) {
      return;
    }

    const currentButton = buttonRefs.current[focusedIndex];
    currentButton?.focus();
  }, [focusedIndex, isInMenu, round]);

  useEffect(() => {
    return () => {
      clearNextRoundTimer();
    };
  }, [clearNextRoundTimer]);

  const selectAnswer = useCallback(
    (choiceIndex: number) => {
      if (!round || answerState.selectedId) {
        return;
      }

      const selected = round.choices[choiceIndex];
      const isCorrect = selected.id === round.correct.id;

      setFocusedIndex(choiceIndex);
      setAnswerState({ selectedId: selected.id, wasCorrect: isCorrect });

      const feedback = FEEDBACK_AUDIO[language];

      clearNextRoundTimer();

      if (isCorrect) {
        setScore((value) => value + 1);
        void play(resolveAssetPath(feedback.correct));

        nextRoundTimer.current = window.setTimeout(() => {
          startNextRound();
        }, NEXT_ROUND_DELAY_CORRECT_MS);
        return;
      }

      const selectedAudio = getCountryAudio(selected.id);

      void (async () => {
        await playAndWait(resolveAssetPath(feedback.wrong));
        await playAndWait(resolveAssetPath(feedback.selected));
        if (selectedAudio) {
          await playAndWait(selectedAudio);
        }

        startNextRound();
      })();
    },
    [answerState.selectedId, clearNextRoundTimer, getCountryAudio, language, play, playAndWait, round, startNextRound]
  );

  useEffect(() => {
    if (isInMenu || !round) {
      return;
    }

    const activeRound = round;

    function onKeyDown(event: KeyboardEvent) {
      if (answerState.selectedId) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((index) => (index + activeRound.choices.length - 1) % activeRound.choices.length);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((index) => (index + 1) % activeRound.choices.length);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectAnswer(focusedIndex);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answerState.selectedId, focusedIndex, isInMenu, round, selectAnswer]);

  const toggleTheme = () => {
    setTheme((value) => (value === 'light' ? 'dark' : 'light'));
  };

  const toggleLanguage = () => {
    setLanguage((value) => (value === 'cs' ? 'en' : 'cs'));
  };

  if (isInMenu) {
    return (
      <main className="menu-shell">
        <section className="menu-card">
          <div className="menu-top-row">
            <h1>{t.title}</h1>
            <button type="button" className="toggle-button" onClick={toggleTheme}>
              {theme === 'light' ? t.themeDark : t.themeLight}
            </button>
          </div>

          <p className="menu-label">{t.chooseLanguage}</p>
          <div className="menu-language-options" role="group" aria-label={t.chooseLanguage}>
            <button
              type="button"
              className={`menu-option ${language === 'cs' ? 'is-active' : ''}`}
              onClick={() => setLanguage('cs')}
            >
              {TRANSLATIONS.cs.languageCs}
            </button>
            <button
              type="button"
              className={`menu-option ${language === 'en' ? 'is-active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              {TRANSLATIONS.en.languageEn}
            </button>
          </div>

          <p className="menu-label">{t.chooseGrid}</p>
          <div className="menu-grid-options" role="group" aria-label={t.chooseGrid}>
            {GRID_OPTIONS.map((option) => (
              <button key={option.id} type="button" className="menu-option" onClick={() => startGame(option)}>
                {option.choices}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (!round || !activeGrid) {
    return null;
  }

  const selectedName = answerState.selectedId ? getCountryName(answerState.selectedId) : '';
  const correctName = getCountryName(round.correct.id);
  const gridStyle = { '--grid-columns': String(activeGrid.columns) } as CSSProperties;

  return (
    <main className="game-shell">
      <header className="top-bar">
        <div className="top-left">
          <h1>{t.title}</h1>
          <div className="header-actions">
            <button type="button" className="menu-back-button" onClick={backToMenu}>
              {t.backToMenu}
            </button>
            <button type="button" className="toggle-button" onClick={toggleLanguage}>
              {language === 'cs' ? TRANSLATIONS.en.languageEn : TRANSLATIONS.cs.languageCs}
            </button>
            <button type="button" className="toggle-button" onClick={toggleTheme}>
              {theme === 'light' ? t.themeDark : t.themeLight}
            </button>
          </div>
        </div>
        <ScoreBoard score={score} roundNumber={roundNumber} scoreLabel={t.scoreLabel} roundLabel={t.roundLabel} />
      </header>

      <section className="controls" aria-label={t.controls}>
        <ReplayButton label={t.replay} onReplay={playCurrentCountryName} />
      </section>

      <section className="feedback" aria-live="polite">
        {answerState.wasCorrect === true && <p className="feedback-good">{t.correct}</p>}
        {answerState.wasCorrect === false && (
          <>
            <p className="feedback-bad">{`${t.wrongSelectedPrefix} ${selectedName}.`}</p>
            <p className="feedback-answer">{`${t.correctAnswerPrefix} ${correctName}.`}</p>
          </>
        )}
      </section>

      <section className="choices-grid" style={gridStyle} aria-label={t.choiceArea}>
        {round.choices.map((choice, index) => {
          const isSelected = answerState.selectedId === choice.id;
          const isWrongChoice = isSelected && answerState.wasCorrect === false;
          const isCorrectChoice = answerState.selectedId !== null && choice.id === round.correct.id;
          const isDimmed = answerState.selectedId !== null && answerState.wasCorrect === false && !isCorrectChoice;
          const displayName = getCountryName(choice.id);

          const badgeLabel = isCorrectChoice
            ? t.correctBadge
            : isWrongChoice
              ? t.selectedBadge
              : undefined;

          return (
            <FlagCard
              key={`${round.correct.id}-${choice.id}-${index}`}
              flag={choice}
              displayName={`${t.flagCardAriaPrefix}: ${displayName}`}
              isFocused={focusedIndex === index}
              isLocked={answerState.selectedId !== null}
              isCorrectChoice={isCorrectChoice}
              isWrongChoice={isWrongChoice}
              isDimmed={isDimmed}
              badgeLabel={badgeLabel}
              onSelect={() => selectAnswer(index)}
              buttonRef={(el) => {
                buttonRefs.current[index] = el;
              }}
            />
          );
        })}
      </section>
    </main>
  );
}
